import {describe, expect, it} from 'vitest';
import {
    sanitizeMacroName,
    getMacroName,
    extractParameters,
    generateCreateMacroSQL,
    generateDropMacroSQL,
} from './table-macros';

describe('sanitizeMacroName', () => {
    it('should convert to lowercase', () => {
        expect(sanitizeMacroName('MyQuery')).toBe('myquery');
        expect(sanitizeMacroName('UPPERCASE')).toBe('uppercase');
    });

    it('should replace spaces with underscores', () => {
        expect(sanitizeMacroName('My Query')).toBe('my_query');
        expect(sanitizeMacroName('multiple   spaces')).toBe('multiple_spaces');
    });

    it('should replace special characters with underscores', () => {
        expect(sanitizeMacroName('My Query!')).toBe('my_query');
        expect(sanitizeMacroName('test@#$%query')).toBe('test_query');
    });

    it('should collapse multiple underscores', () => {
        expect(sanitizeMacroName('test___query')).toBe('test_query');
        expect(sanitizeMacroName('a--b__c')).toBe('a_b_c');
    });

    it('should trim leading and trailing underscores', () => {
        expect(sanitizeMacroName('_test_')).toBe('test');
        expect(sanitizeMacroName('___leading')).toBe('leading');
        expect(sanitizeMacroName('trailing___')).toBe('trailing');
    });

    it('should preserve numbers', () => {
        expect(sanitizeMacroName('query123')).toBe('query123');
        expect(sanitizeMacroName('2024_data')).toBe('2024_data');
    });

    it('should handle edge cases', () => {
        expect(sanitizeMacroName('')).toBe('');
        expect(sanitizeMacroName('___')).toBe('');
        expect(sanitizeMacroName('a')).toBe('a');
    });
});

describe('getMacroName', () => {
    it('should add node_ prefix', () => {
        expect(getMacroName('employees')).toBe('node_employees');
        expect(getMacroName('My Query')).toBe('node_my_query');
    });

    it('should sanitize the name before adding prefix', () => {
        expect(getMacroName('My Query!')).toBe('node_my_query');
        expect(getMacroName('TEST Query 123')).toBe('node_test_query_123');
    });
});

describe('extractParameters', () => {
    it('should extract single parameter', () => {
        const sql = 'SELECT * FROM users WHERE city = {{city}}';
        expect(extractParameters(sql)).toEqual(['city']);
    });

    it('should extract multiple parameters', () => {
        const sql = 'SELECT * FROM users WHERE city = {{city}} AND age > {{min_age}}';
        expect(extractParameters(sql)).toEqual(['city', 'min_age']);
    });

    it('should return unique parameters', () => {
        const sql = 'SELECT * FROM users WHERE city = {{city}} OR hometown = {{city}}';
        expect(extractParameters(sql)).toEqual(['city']);
    });

    it('should return empty array when no parameters', () => {
        const sql = 'SELECT * FROM users';
        expect(extractParameters(sql)).toEqual([]);
    });

    it('should trim whitespace from parameter names', () => {
        const sql = 'SELECT * FROM users WHERE city = {{ city_name }}';
        expect(extractParameters(sql)).toEqual(['city_name']);
    });

    it('should handle parameters with underscores', () => {
        const sql = 'SELECT * FROM data WHERE start_date = {{start_date}} AND end_date = {{end_date}}';
        expect(extractParameters(sql)).toEqual(['start_date', 'end_date']);
    });

    it('should handle parameters in complex queries', () => {
        const sql = `
            CREATE TABLE temp AS SELECT * FROM raw WHERE id = {{id}};
            SELECT * FROM temp WHERE status = {{status}};
        `;
        expect(extractParameters(sql)).toEqual(['id', 'status']);
    });
});

describe('generateCreateMacroSQL', () => {
    describe('without parameters', () => {
        it('should generate simple macro for basic SELECT', () => {
            const sql = generateCreateMacroSQL('employees', 'SELECT * FROM raw.employees');
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_employees() AS TABLE (FROM query_result('SELECT * FROM raw.employees'))"
            );
        });

        it('should escape single quotes in SQL', () => {
            const sql = generateCreateMacroSQL('test', "SELECT * FROM users WHERE name = 'John'");
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_test() AS TABLE (FROM query_result('SELECT * FROM users WHERE name = ''John'''))"
            );
        });

        it('should handle multi-statement queries', () => {
            const sql = generateCreateMacroSQL('test', 'CREATE TABLE t AS SELECT 1; FROM t;');
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_test() AS TABLE (FROM query_result('CREATE TABLE t AS SELECT 1; FROM t;'))"
            );
        });

        it('should sanitize relation name in macro name', () => {
            const sql = generateCreateMacroSQL('My Query!', 'SELECT 1');
            expect(sql).toContain('node_my_query()');
        });
    });

    describe('with parameters', () => {
        it('should generate parameterized macro', () => {
            const sql = generateCreateMacroSQL(
                'train_stations',
                'SELECT * FROM stations WHERE city = {{city_filter}}'
            );
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_train_stations(city_filter) AS TABLE (FROM query_result(format('SELECT * FROM stations WHERE city = {}', city_filter)))"
            );
        });

        it('should handle multiple parameters', () => {
            const sql = generateCreateMacroSQL(
                'filtered_data',
                'SELECT * FROM data WHERE start = {{start_date}} AND end = {{end_date}}'
            );
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_filtered_data(start_date, end_date) AS TABLE (FROM query_result(format('SELECT * FROM data WHERE start = {} AND end = {}', start_date, end_date)))"
            );
        });

        it('should handle repeated parameters', () => {
            const sql = generateCreateMacroSQL(
                'test',
                'SELECT * FROM a WHERE x = {{val}} UNION SELECT * FROM b WHERE y = {{val}}'
            );
            // Parameter should appear once in signature but twice in template
            expect(sql).toContain('node_test(val)');
            expect(sql).toContain('x = {} UNION SELECT * FROM b WHERE y = {}');
        });

        it('should escape quotes in parameterized queries', () => {
            const sql = generateCreateMacroSQL(
                'test',
                "SELECT '{{param}}' as value"
            );
            expect(sql).toContain("''{}''");
        });
    });
});

describe('generateDropMacroSQL', () => {
    it('should generate DROP MACRO statement', () => {
        const sql = generateDropMacroSQL('employees');
        expect(sql).toBe('DROP MACRO IF EXISTS node_employees');
    });

    it('should sanitize relation name', () => {
        const sql = generateDropMacroSQL('My Query!');
        expect(sql).toBe('DROP MACRO IF EXISTS node_my_query');
    });
});

describe('temporary macros (read-only mode)', () => {
    it('should generate TEMP macro when temporary=true', () => {
        const sql = generateCreateMacroSQL('test', 'SELECT 1', true);
        expect(sql).toContain('CREATE OR REPLACE TEMP MACRO');
        expect(sql).toContain('node_test()');
    });

    it('should generate regular macro when temporary=false', () => {
        const sql = generateCreateMacroSQL('test', 'SELECT 1', false);
        expect(sql).toContain('CREATE OR REPLACE MACRO');
        expect(sql).not.toContain('TEMP');
    });

    it('should generate TEMP macro with parameters', () => {
        const sql = generateCreateMacroSQL('test', 'SELECT {{x}}', true);
        expect(sql).toContain('CREATE OR REPLACE TEMP MACRO');
        expect(sql).toContain('node_test(x)');
    });
});

describe('macro update behavior', () => {
    it('should use CREATE OR REPLACE to allow updating macros when SQL changes', () => {
        const sql1 = generateCreateMacroSQL('test', 'SELECT 1');
        const sql2 = generateCreateMacroSQL('test', 'SELECT 2');

        // Both should use CREATE OR REPLACE, allowing updates
        expect(sql1).toContain('CREATE OR REPLACE MACRO');
        expect(sql2).toContain('CREATE OR REPLACE MACRO');

        // Same macro name, different SQL
        expect(sql1).toContain('node_test()');
        expect(sql2).toContain('node_test()');
        expect(sql1).toContain("'SELECT 1'");
        expect(sql2).toContain("'SELECT 2'");
    });

    it('should generate different macro when parameters change', () => {
        const sql1 = generateCreateMacroSQL('test', 'SELECT * FROM t WHERE x = {{a}}');
        const sql2 = generateCreateMacroSQL('test', 'SELECT * FROM t WHERE x = {{a}} AND y = {{b}}');

        expect(sql1).toContain('node_test(a)');
        expect(sql2).toContain('node_test(a, b)');
    });
});
