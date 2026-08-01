import {describe, expect, it} from "vitest";
import {parseSourceEffect, undoStatement} from "@/state/sources/source-effects";

/** Convenience: the statement that undoes `statement`, or null if it leaves nothing behind. */
function undo(statement: string): string | null {
    const effect = parseSourceEffect(statement);
    return effect ? undoStatement(effect) : null;
}

describe('parseSourceEffect', () => {
    it('reverses an attach', () => {
        expect(undo("ATTACH 'sales.duckdb' AS sales;")).toBe("DETACH DATABASE IF EXISTS sales;");
        expect(undo("ATTACH IF NOT EXISTS 'https://x/y.duckdb' AS y (READ_ONLY);"))
            .toBe("DETACH DATABASE IF EXISTS y;");
    });

    it('never detaches one of the project databases', () => {
        expect(undo("ATTACH 'other.duckdb' AS dash_data;")).toBeNull();
    });

    it('reverses tables and views created outside the project databases', () => {
        expect(undo("CREATE TABLE memory.staging AS SELECT * FROM 's3://bucket/f.parquet';"))
            .toBe("DROP TABLE IF EXISTS memory.staging;");
        expect(undo("CREATE OR REPLACE VIEW memory.main.events AS SELECT 1;"))
            .toBe("DROP VIEW IF EXISTS memory.main.events;");
    });

    it('qualifies temp objects so the drop cannot hit a project table', () => {
        expect(undo("CREATE TEMPORARY TABLE scratch AS SELECT 1;"))
            .toBe("DROP TABLE IF EXISTS temp.main.scratch;");
    });

    it('leaves the project\'s own tables alone', () => {
        // Unqualified: the replay runs with the project data database as the current catalog, so
        // this lands in the project's own file and disappears with it on DETACH.
        expect(undo("CREATE TABLE monthly AS SELECT 1;")).toBeNull();
        expect(undo("CREATE TABLE dash_data.monthly AS SELECT 1;")).toBeNull();
    });

    it('reverses named secrets only', () => {
        expect(undo("CREATE SECRET my_s3 (TYPE S3, KEY_ID 'a');"))
            .toBe("DROP SECRET IF EXISTS my_s3;");
        expect(undo("CREATE SECRET (TYPE S3, KEY_ID 'a');")).toBeNull();
    });

    it('ignores statements with no meaningful inverse', () => {
        expect(undo("INSTALL httpfs;")).toBeNull();
        expect(undo("LOAD httpfs;")).toBeNull();
        expect(undo("SET memory_limit = '4GB';")).toBeNull();
        expect(undo("SELECT 1;")).toBeNull();
    });
});
