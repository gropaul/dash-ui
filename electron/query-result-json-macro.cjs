// Single source of truth for the `query_result_json` macro.
//
// It runs in two different runtimes that can't share a normal import:
//   - the renderer / DuckDB WASM path (getJsonMacro() in duckdb-wasm/utils.ts imports this)
//   - the Electron main process / native path (electron/duckdb.cjs requires this)
// It lives in electron/ because the packaged app only ships electron/** (see electron-builder.yml),
// and it's CommonJS so the main process can require() it directly while the renderer bundles it.
//
// The macro makes DuckDB itself build the {rows, columns, stats} object via to_json, so native and
// WASM return byte-identical results and share one parse path in the renderer. Depends on the `dash`
// community extension (query_result()), installed/loaded here.
//
// Uses DuckDB's `lambda x : ...` syntax (not the older `x -> ...` arrow, which collides with the
// JSON `->` operator) and `* EXCLUDE (...)` for column exclusion, mirroring the dash extension.

module.exports = `
        INSTALL dash FROM community;
        LOAD dash;
        CREATE OR REPLACE TEMP MACRO query_result_json(query_text) as TABLE (WITH data AS MATERIALIZED (FROM query_result(query_text)),
             dash_row_number_ids AS (SELECT range AS dash_row_number_id
                                     FROM range((SELECT COUNT(*) FROM data))),
             json_data AS (SELECT dash_row_number_ids.dash_row_number_id,
                                  to_json(COLUMNS(* EXCLUDE (dash_row_number_id)))
                           FROM data POSITIONAL
                                    JOIN dash_row_number_ids),
             json_list AS MATERIALIZED (SELECT IFNULL(
                                                       list([* COLUMNS(* EXCLUDE (dash_row_number_id))]
                                                            ORDER BY dash_row_number_id),
                                                       []
                                               ) AS data
                                        FROM json_data),
             types_data AS (SELECT ANY_VALUE(typeof(COLUMNS(*)))
                            FROM data),
             types_list_data AS (SELECT [(*COLUMNS(*))]                                       AS types_with_null,
                                        list_filter(types_with_null, lambda x : x IS NOT NULL) AS types
                                 FROM types_data),
             names_data AS (SELECT ANY_VALUE(alias(COLUMNS(*)))
                            FROM data),
             names_list_data AS (SELECT [(*COLUMNS(*))]                                       AS names_with_null,
                                        list_filter(names_with_null, lambda x : x IS NOT NULL) AS names
                                 FROM names_data),
             combined_data AS (SELECT data                                             AS rows,
                                      list_transform(
                                              list_zip(types, names),
                                              lambda x : { type: x[1], name: x[2] }
        ) AS columns,
                                      names
                               FROM json_list POSITIONAL
                                        JOIN types_list_data POSITIONAL
                                        JOIN names_list_data)
        SELECT json_object(
                       'rows', rows,
                       'columns', columns,
                       'stats', { rows: len(rows) }
    ) as data,
               names
        FROM combined_data);
    `;
