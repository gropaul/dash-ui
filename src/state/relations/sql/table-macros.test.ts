import {describe, expect, it, vi} from 'vitest';

// Stub out modules with side effects (DuckDB connections, relation event bus, web-llm chain)
vi.mock('@/state/connections/connections-service', () => ({
    ConnectionsService: {getInstance: () => ({executeQuery: async () => ({rows: [], columns: []}), getDatabaseConnection: () => { throw new Error('no connection'); }, onDatabaseConnectionChange: () => {}})},
}));
vi.mock('@/state/relations/all-relation-utils', () => ({getAllRelations: () => []}));
vi.mock('../event/relation-events', () => ({onRelationEvent: () => {}, RelationEvent: {}}));
vi.mock('@/state/relations/sql/selection-query', () => ({buildSelectionFilteredQuery: (q: string) => q}));

import {
    sanitizeMacroName,
    getMacroName,
    extractParameters,
    extractMacroRefs,
    generateCreateMacroSQLInternal,
    generateDropMacroSQL,
    buildMacroDependencies,
    topologicalSort,
    orderMacroStatements,
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
            const sql = generateCreateMacroSQLInternal('employees', 'SELECT * FROM raw.employees');
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_employees() AS TABLE (FROM query_result('SELECT * FROM raw.employees'))"
            );
        });

        it('should escape single quotes in SQL', () => {
            const sql = generateCreateMacroSQLInternal('test', "SELECT * FROM users WHERE name = 'John'");
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_test() AS TABLE (FROM query_result('SELECT * FROM users WHERE name = ''John'''))"
            );
        });

        it('should handle multi-statement queries', () => {
            const sql = generateCreateMacroSQLInternal('test', 'CREATE TABLE t AS SELECT 1; FROM t;');
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_test() AS TABLE (FROM query_result('CREATE TABLE t AS SELECT 1; FROM t;'))"
            );
        });

        it('should sanitize relation name in macro name', () => {
            const sql = generateCreateMacroSQLInternal('My Query!', 'SELECT 1');
            expect(sql).toContain('node_my_query()');
        });
    });

    describe('with parameters', () => {
        it('should generate parameterized macro using replace() chain', () => {
            const sql = generateCreateMacroSQLInternal(
                'train_stations',
                'SELECT * FROM stations WHERE city = {{city_filter}}'
            );
            expect(sql).toBe(
                "CREATE OR REPLACE MACRO node_train_stations(city_filter) AS TABLE (FROM query_result(replace('SELECT * FROM stations WHERE city = {{city_filter}}', '{{city_filter}}', city_filter::VARCHAR)))"
            );
        });

        it('should handle multiple parameters with nested replace() calls', () => {
            const sql = generateCreateMacroSQLInternal(
                'filtered_data',
                'SELECT * FROM data WHERE start = {{start_date}} AND end = {{end_date}}'
            );
            expect(sql).toContain('node_filtered_data(start_date, end_date)');
            // Outer replace wraps the inner one
            expect(sql).toContain("replace(replace(");
            expect(sql).toContain("'{{start_date}}', start_date::VARCHAR");
            expect(sql).toContain("'{{end_date}}', end_date::VARCHAR");
        });

        it('should handle repeated parameters (one replace() replaces all occurrences)', () => {
            const sql = generateCreateMacroSQLInternal(
                'test',
                'SELECT * FROM a WHERE x = {{val}} UNION SELECT * FROM b WHERE y = {{val}}'
            );
            // One unique param → one replace() call; replaceAll covers both occurrences
            expect(sql).toContain('node_test(val)');
            expect(sql).toContain("'{{val}}', val::VARCHAR");
            expect(sql).not.toContain('replace(replace(');
        });

        it('should escape single quotes in parameterized template', () => {
            const sql = generateCreateMacroSQLInternal(
                'test',
                "SELECT '{{param}}' as value"
            );
            // Single quotes in the template are doubled; placeholder is preserved verbatim
            expect(sql).toContain("''{{param}}''");
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
    it('should generate regular macro by default (isDatabaseReadonly returns false in mock)', () => {
        const sql = generateCreateMacroSQLInternal('test', 'SELECT 1');
        expect(sql).toContain('CREATE OR REPLACE MACRO');
        expect(sql).not.toContain('TEMP');
        expect(sql).toContain('node_test()');
    });

    it('should generate regular macro with parameters by default', () => {
        const sql = generateCreateMacroSQLInternal('test', 'SELECT {{x}}');
        expect(sql).toContain('CREATE OR REPLACE MACRO');
        expect(sql).toContain('node_test(x)');
    });
});

describe('macro update behavior', () => {
    it('should use CREATE OR REPLACE to allow updating macros when SQL changes', () => {
        const sql1 = generateCreateMacroSQLInternal('test', 'SELECT 1');
        const sql2 = generateCreateMacroSQLInternal('test', 'SELECT 2');

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
        const sql1 = generateCreateMacroSQLInternal('test', 'SELECT * FROM t WHERE x = {{a}}');
        const sql2 = generateCreateMacroSQLInternal('test', 'SELECT * FROM t WHERE x = {{a}} AND y = {{b}}');

        expect(sql1).toContain('node_test(a)');
        expect(sql2).toContain('node_test(a, b)');
    });
});

describe('extractMacroRefs', () => {
    it('should extract macro references from SQL', () => {
        expect(extractMacroRefs('SELECT * FROM node_employees()')).toEqual(['employees']);
    });

    it('should extract multiple references', () => {
        expect(extractMacroRefs('SELECT * FROM node_a() JOIN node_b() ON 1=1')).toEqual(['a', 'b']);
    });

    it('should deduplicate references', () => {
        expect(extractMacroRefs('SELECT * FROM node_x() UNION SELECT * FROM node_x()')).toEqual(['x']);
    });

    it('should handle whitespace before parens', () => {
        expect(extractMacroRefs('SELECT * FROM node_test ()')).toEqual(['test']);
    });

    it('should return empty for no references', () => {
        expect(extractMacroRefs('SELECT * FROM employees')).toEqual([]);
    });
});

describe('buildMacroDependencies', () => {
    it('should detect dependency between macros', () => {
        const deps = buildMacroDependencies([
            { key: 'a', baseSql: 'SELECT * FROM node_b()' },
            { key: 'b', baseSql: 'SELECT 1' },
        ]);
        expect(deps.get('a')).toEqual(['b']);
        expect(deps.get('b')).toEqual([]);
    });

    it('should ignore self-references', () => {
        const deps = buildMacroDependencies([
            { key: 'a', baseSql: 'SELECT * FROM node_a()' },
        ]);
        expect(deps.get('a')).toEqual([]);
    });

    it('should ignore references to unknown macros', () => {
        const deps = buildMacroDependencies([
            { key: 'a', baseSql: 'SELECT * FROM node_unknown()' },
        ]);
        expect(deps.get('a')).toEqual([]);
    });

    it('should handle multiple dependencies', () => {
        const deps = buildMacroDependencies([
            { key: 'c', baseSql: 'SELECT * FROM node_a() JOIN node_b()' },
            { key: 'a', baseSql: 'SELECT 1' },
            { key: 'b', baseSql: 'SELECT 2' },
        ]);
        expect(deps.get('c')).toEqual(['a', 'b']);
    });
});

describe('topologicalSort', () => {
    it('should return single item', () => {
        const deps = new Map([['a', []]]);
        expect(topologicalSort(['a'], deps)).toEqual(['a']);
    });

    it('should order dependency before dependent', () => {
        const deps = new Map([['a', ['b']], ['b', []]]);
        const result = topologicalSort(['a', 'b'], deps);
        expect(result.indexOf('b')).toBeLessThan(result.indexOf('a'));
    });

    it('should handle a chain: c -> b -> a', () => {
        const deps = new Map([['c', ['b']], ['b', ['a']], ['a', []]]);
        const result = topologicalSort(['c', 'b', 'a'], deps);
        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle independent items in input order', () => {
        const deps = new Map([['x', []], ['y', []], ['z', []]]);
        expect(topologicalSort(['x', 'y', 'z'], deps)).toEqual(['x', 'y', 'z']);
    });

    it('should handle a diamond: d -> b,c -> a', () => {
        const deps = new Map([
            ['d', ['b', 'c']],
            ['b', ['a']],
            ['c', ['a']],
            ['a', []],
        ]);
        const result = topologicalSort(['d', 'b', 'c', 'a'], deps);
        expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
        expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'));
        expect(result.indexOf('b')).toBeLessThan(result.indexOf('d'));
        expect(result.indexOf('c')).toBeLessThan(result.indexOf('d'));
    });

    it('should break cycles gracefully', () => {
        const deps = new Map([['a', ['b']], ['b', ['a']]]);
        const result = topologicalSort(['a', 'b'], deps);
        // Both should appear exactly once
        expect(result).toHaveLength(2);
        expect(result).toContain('a');
        expect(result).toContain('b');
    });
});

describe('orderMacroStatements', () => {
    it('should order create statements by dependency', () => {
        const result = orderMacroStatements([
            { key: 'report', baseSql: 'SELECT * FROM node_employees()', createSql: 'CREATE MACRO node_report...' },
            { key: 'employees', baseSql: 'SELECT * FROM raw.emp', createSql: 'CREATE MACRO node_employees...' },
        ]);
        expect(result).toEqual([
            'CREATE MACRO node_employees...',
            'CREATE MACRO node_report...',
        ]);
    });

    it('should handle three-level chain', () => {
        const result = orderMacroStatements([
            { key: 'top', baseSql: 'FROM node_mid()', createSql: 'SQL_TOP' },
            { key: 'mid', baseSql: 'FROM node_base()', createSql: 'SQL_MID' },
            { key: 'base', baseSql: 'SELECT 1', createSql: 'SQL_BASE' },
        ]);
        expect(result).toEqual(['SQL_BASE', 'SQL_MID', 'SQL_TOP']);
    });

    it('should preserve order for independent macros', () => {
        const result = orderMacroStatements([
            { key: 'a', baseSql: 'SELECT 1', createSql: 'SQL_A' },
            { key: 'b', baseSql: 'SELECT 2', createSql: 'SQL_B' },
        ]);
        expect(result).toEqual(['SQL_A', 'SQL_B']);
    });
});
