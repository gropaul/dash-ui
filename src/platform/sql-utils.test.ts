import {describe, it, expect} from 'vitest';
import {splitSQL} from './sql-utils';

describe('splitSQL', () => {
    describe('basic statement splitting', () => {
        it('should split simple statements separated by semicolons', () => {
            const sql = 'SELECT * FROM users; SELECT * FROM orders;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                'SELECT * FROM orders'
            ]);
        });

        it('should return single statement without semicolon', () => {
            const sql = 'SELECT * FROM users';
            const result = splitSQL(sql);
            expect(result).toEqual(['SELECT * FROM users']);
        });

        it('should return single statement with semicolon', () => {
            const sql = 'SELECT * FROM users;';
            const result = splitSQL(sql);
            expect(result).toEqual(['SELECT * FROM users']);
        });

        it('should handle empty string', () => {
            const sql = '';
            const result = splitSQL(sql);
            expect(result).toEqual([]);
        });

        it('should handle only semicolons', () => {
            const sql = ';;;';
            const result = splitSQL(sql);
            expect(result).toEqual([]);
        });

        it('should handle whitespace-only statements', () => {
            const sql = '   ;   ;   ';
            const result = splitSQL(sql);
            expect(result).toEqual([]);
        });

        it('should trim whitespace from statements', () => {
            const sql = '  SELECT * FROM users  ;  INSERT INTO logs VALUES (1)  ';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                'INSERT INTO logs VALUES (1)'
            ]);
        });
    });

    describe('single quote strings', () => {
        it('should keep semicolons inside single-quoted strings', () => {
            const sql = "SELECT ';';";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT ';'"
            ]);

        });
        it('should ignore semicolons inside single-quoted strings', () => {
            const sql = "SELECT * FROM users WHERE name = 'John; DROP TABLE users';";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT * FROM users WHERE name = 'John; DROP TABLE users'"
            ]);
        });

        it('should handle escaped single quotes (two consecutive single quotes)', () => {
            const sql = "SELECT * FROM users WHERE name = 'O''Brien';";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT * FROM users WHERE name = 'O''Brien'"
            ]);
        });

        it('should handle multiple escaped quotes in a string', () => {
            const sql = "SELECT 'It''s a ''test'' string';";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT 'It''s a ''test'' string'"
            ]);
        });

        it('should handle semicolons after strings', () => {
            const sql = "SELECT 'value1'; SELECT 'value2';";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT 'value1'",
                "SELECT 'value2'"
            ]);
        });
    });

    describe('double quote identifiers', () => {
        it('should ignore semicolons inside double-quoted identifiers', () => {
            const sql = 'SELECT * FROM "table;name" WHERE id = 1;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM "table;name" WHERE id = 1'
            ]);
        });

        it('should handle escaped double quotes (two consecutive double quotes)', () => {
            const sql = 'SELECT * FROM "table""name";';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM "table""name"'
            ]);
        });

        it('should handle both single and double quotes in same statement', () => {
            const sql = `SELECT *
                         FROM "my;table"
                         WHERE name = 'John;Doe';`;
            const result = splitSQL(sql);
            expect(result).toEqual([
                `SELECT *
                         FROM "my;table"
                         WHERE name = 'John;Doe'`
            ]);
        });
    });

    describe('line comments', () => {
        it('should split on semicolons even with line comments after', () => {
            const sql = 'SELECT * FROM users; -- this is a comment with ; semicolon\nSELECT * FROM orders;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                '-- this is a comment with ; semicolon\nSELECT * FROM orders'
            ]);
        });

        it('should split on semicolon with comment after and no following statement', () => {
            const sql = 'SELECT * FROM users; -- final comment';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                '-- final comment'
            ]);
        });

        it('should handle multiple line comments across statements', () => {
            const sql = '-- first comment\nSELECT * FROM users; -- inline comment\n-- another comment\nSELECT * FROM orders;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                '-- first comment\nSELECT * FROM users',
                '-- inline comment\n-- another comment\nSELECT * FROM orders'
            ]);
        });

        it('should not treat -- inside strings as comments', () => {
            const sql = "SELECT '--not a comment' FROM users;";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT '--not a comment' FROM users"
            ]);
        });
    });

    describe('block comments', () => {
        it('should split on semicolons even with block comments after', () => {
            const sql = 'SELECT * FROM users; /* comment with ; semicolon */ SELECT * FROM orders;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                '/* comment with ; semicolon */ SELECT * FROM orders'
            ]);
        });

        it('should split on semicolon with multiline block comment after', () => {
            const sql = `SELECT *
                         FROM users;
/* This is a
   multiline comment
   with ; semicolon */
            SELECT *
            FROM orders;`;
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT *\n                         FROM users',
                '/* This is a\n   multiline comment\n   with ; semicolon */\n            SELECT *\n            FROM orders'
            ]);
        });

        it('should not treat /* inside strings as comment start', () => {
            const sql = "SELECT '/* not a comment' FROM users;";
            const result = splitSQL(sql);
            expect(result).toEqual([
                "SELECT '/* not a comment' FROM users"
            ]);
        });

        it('should handle block comment at start of SQL', () => {
            const sql = '/* header comment */ SELECT * FROM users;';
            const result = splitSQL(sql);
            expect(result).toEqual([
                '/* header comment */ SELECT * FROM users'
            ]);
        });
    });

    describe('complex scenarios', () => {
        it('should handle statements with all types of quotes and comments', () => {
            const sql = `-- Create table
CREATE TABLE "users;table" (
  id INT,
  name VARCHAR(50) -- user's name
);
/* Insert data */
INSERT INTO "users;table" VALUES (1, 'O''Brien; admin'); -- semicolon in string
SELECT * FROM "users;table";`;

            const result = splitSQL(sql);
            expect(result).toHaveLength(3);
            expect(result[0]).toContain('CREATE TABLE');
            expect(result[1]).toContain('INSERT INTO');
            expect(result[2]).toContain('SELECT * FROM');
        });

        it('should handle multiple statements with mixed content', () => {
            const sql = `
                SELECT *
                FROM users
                WHERE email = 'test@example.com';
                -- Update statement
                UPDATE users
                SET active = true
                WHERE id = 1;
                /* Delete old records */
                DELETE
                FROM logs
                WHERE created_at < '2020-01-01';
            `;
            const result = splitSQL(sql);
            expect(result).toHaveLength(3);
            expect(result[0]).toContain('SELECT');
            expect(result[1]).toContain('UPDATE');
            expect(result[2]).toContain('DELETE');
        });

        it('should handle nested quotes correctly', () => {
            const sql = `SELECT '{"key": "value; with semicolon"}' as json_data;`;
            const result = splitSQL(sql);
            expect(result).toEqual([
                `SELECT '{"key": "value; with semicolon"}' as json_data`
            ]);
        });

        it('should preserve all whitespace and formatting within statements', () => {
            const sql = `SELECT\n  id,\n  name\nFROM\n  users;`;
            const result = splitSQL(sql);
            expect(result).toHaveLength(1);
            expect(result[0]).toContain('\n');
        });
    });

    describe('edge cases', () => {
        it('should handle statements with no content after last semicolon', () => {
            const sql = 'SELECT * FROM users;';
            const result = splitSQL(sql);
            expect(result).toEqual(['SELECT * FROM users']);
        });

        it('should handle very long strings', () => {
            const longString = 'a'.repeat(10000);
            const sql = `SELECT '${longString}' as data;`;
            const result = splitSQL(sql);
            expect(result).toHaveLength(1);
            expect(result[0]).toContain(longString);
        });

        it('should handle unclosed string gracefully', () => {
            // Unclosed strings should be handled - string extends to end
            const sql = "SELECT * FROM users WHERE name = 'unclosed";
            const result = splitSQL(sql);
            expect(result).toHaveLength(1);
        });

        it('should handle unclosed block comment gracefully', () => {
            // Unclosed comment extends to end of input, but semicolon still splits
            const sql = "SELECT * FROM users; /* unclosed comment";
            const result = splitSQL(sql);
            expect(result).toEqual([
                'SELECT * FROM users',
                '/* unclosed comment'
            ]);
        });

        it('should handle empty statements between semicolons', () => {
            const sql = 'SELECT 1;;SELECT 2;';
            const result = splitSQL(sql);
            expect(result).toEqual(['SELECT 1', 'SELECT 2']);
        });
    });

    describe('keepSemicolon parameter', () => {
        it('should keep semicolons when keepSemicolon is true', () => {
            const sql = 'SELECT * FROM users; SELECT * FROM orders;';
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                'SELECT * FROM users;',
                'SELECT * FROM orders;'
            ]);
        });

        it('should remove semicolons when keepSemicolon is false (default)', () => {
            const sql = 'SELECT * FROM users; SELECT * FROM orders;';
            const result = splitSQL(sql, false);
            expect(result).toEqual([
                'SELECT * FROM users',
                'SELECT * FROM orders'
            ]);
        });

        it('should keep semicolons in single statement with keepSemicolon=true', () => {
            const sql = 'SELECT * FROM users;';
            const result = splitSQL(sql, true);
            expect(result).toEqual(['SELECT * FROM users;']);
        });

        it('should handle statements without trailing semicolon with keepSemicolon=true', () => {
            const sql = 'SELECT * FROM users; SELECT * FROM orders';
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                'SELECT * FROM users;',
                'SELECT * FROM orders'
            ]);
        });

        it('should keep semicolons with multiple statements and keepSemicolon=true', () => {
            const sql = 'CREATE TABLE users (id INT); INSERT INTO users VALUES (1); SELECT * FROM users;';
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                'CREATE TABLE users (id INT);',
                'INSERT INTO users VALUES (1);',
                'SELECT * FROM users;'
            ]);
        });

        it('should ignore semicolons in strings with keepSemicolon=true', () => {
            const sql = "SELECT 'value; with semicolon'; SELECT 'another';";
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                "SELECT 'value; with semicolon';",
                "SELECT 'another';"
            ]);
        });

        it('should handle comments with keepSemicolon=true', () => {
            const sql = 'SELECT * FROM users; -- comment\nSELECT * FROM orders;';
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                'SELECT * FROM users;',
                '-- comment\nSELECT * FROM orders;'
            ]);
        });

        it('should handle empty statements with keepSemicolon=true', () => {
            const sql = 'SELECT 1;;SELECT 2;';
            const result = splitSQL(sql, true);
            // When keepSemicolon=true, consecutive semicolons create a statement with just ";"
            expect(result).toEqual(['SELECT 1;', ';', 'SELECT 2;']);
        });

        it('should preserve whitespace trimming with keepSemicolon=true', () => {
            const sql = '  SELECT * FROM users  ;  INSERT INTO logs VALUES (1)  ;';
            const result = splitSQL(sql, true);
            expect(result).toEqual([
                'SELECT * FROM users  ;',
                'INSERT INTO logs VALUES (1)  ;'
            ]);
        });
    });
});