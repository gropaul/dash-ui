# Working with a Dash project

Dash is a data exploration app on DuckDB. A project is a set of files: pages (`.md`), queries (`.sql`) and
folders. They live in Dash, not on disk: use the file tools, with paths relative to the project root. Read a file
before changing it, and change it with small `edit_file` calls rather than rewriting it.

Run every query with the `query` tool before putting it in a file, and check the column names you use in `x`,
`y` and `column`. Pass `page` to run SQL as a block of that page (see "Blocks reading blocks").

To show data in your reply, write a block fence (see "Blocks") in the message itself: Dash runs it and shows the
chart or table under your text. Its SQL must be one reading statement. It can call `refs.<query file>()`, but not
the blocks of a page, and an `input` path is from the project root.

## Query files (`.sql`)

SQL under optional `-- key: value` header lines (the keys under "Header keys"). Without `view` a query shows as a
table. The file name is the query's name and must be a lowercase SQL identifier: `busiest_stations.sql`.

Every query file is a DuckDB macro, `dash.refs.<file name>()`, usable from the `query` tool, from other query
files and from pages. Query names are unique in the whole project, whatever folder they are in.

## Pages (`.md`)

Markdown: headings `#` to `###`, paragraphs, lists (`-`, `1.`, `- [ ]`), `>` quotes, `---`, `**bold**`,
`*italic*`, `` `code` ``, links, and code fences. Start with a `#` title; a page's name is its file name. Link
another page by its path relative to this page, in `<…>` when it has spaces: `[Sales](<../Q3/Sales.md>)`.

### Blocks

A ```` ```sql ```` fence with a `view` or `input` header line is a block that shows data; without one it stays a
plain code block.

````md
```sql busiest_stations
-- view: bar
-- x: StationName
-- y: num_services
-- rows: 6
SELECT StationName, count(*) AS num_services
FROM 'https://example.org/services.parquet'
GROUP BY ALL ORDER BY num_services DESC LIMIT 10
```
````

- **Name**: only the word after `sql` on the fence line names a block (`busiest_stations`). It is a lowercase
  SQL identifier, unique on the page, and shown as the title ("Busiest stations"). There is no `-- name:` or
  `-- title:` key; such lines are kept but do nothing. A block without a name is shown but can't be read by
  others. For another heading, write a markdown heading above the block.
- **Header**: the leading `-- key: value` lines. The header ends at the first other line; the rest is the SQL.
  A comment right under the header must not contain `word:`, or it is read as a header key.

### Header keys

| Key | Meaning |
|---|---|
| `view` | `bar`, `line`, `area`, `scatter`, `pie`, `radar` (charts), `table`, `text`, `select` (dropdown) or `slider`. |
| `x` | Chart: the column on the x axis; `pie`: the slice label. |
| `y` | Chart: value column(s), comma separated; `pie`: the first is the slice size. |
| `column` | `select`: the column whose values the dropdown offers. |
| `rows` | Pages only: height in grid rows of 48px; 6 suits charts and tables. Leave it out for `select` and `slider`. |
| `input` | Pages only: a query file to show, by its path relative to the page (`-- input: ../orders.sql`). The block takes its SQL and view and has no SQL of its own; its other keys override the view. |
| `settings` | JSON with setup the keys above can't say, under the view's name (below). Leave it out otherwise. |

`settings` nests by view; keys Dash doesn't know are dropped when the file is saved:

- `text` shows the first row, by default its first column as the headline and the second as the detail:
  `-- settings: {"text": {"titleColumn": "num_services", "subtitleColumn": "StationName"}}`
- `slider` filters its rows by a numeric column, `mode` one of `eq`, `lower`, `higher`, `in_range`, `out_range`:
  `-- settings: {"slider": {"column": "price", "mode": "in_range"}}`
- `select` allows several picks with `-- settings: {"select": {"multiSelect": true}}`.

### Blocks reading blocks

Inside a page, `refs.<name>()` (or `dash.refs.<name>()`) reads another named block of the same page. When a
block runs, the call is replaced by that block's query with the viewer's current pick: a `select` or `slider`
block gives its rows filtered to the pick, or all rows when nothing is picked. So a dropdown filters charts:

````md
```sql service_type
-- view: select
-- column: ServiceType
SELECT DISTINCT ServiceType FROM 'https://example.org/services.parquet'
```

```sql busiest_stations_of_type
-- view: bar
-- x: StationName
-- y: num_services
-- rows: 6
SELECT StationName, count(*) AS num_services
FROM 'https://example.org/services.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL ORDER BY num_services DESC LIMIT 10
```
````

- Block refs are not DuckDB macros: they don't appear in `duckdb_functions()`, and a plain `query` can't call
  them. Run the SQL with `query` and `page` set to the page's path to try it as a block of that page.
- A call naming no block of the page calls the query file of that name; a block wins over a query file with the
  same name. Blocks can't read blocks of other pages; put a shared query in a `.sql` file instead.
- `IN` needs a subquery of one column: select the column, not `*`.
- Give a dropdown `SELECT DISTINCT <column>` when others filter with `IN`; give it full rows when others
  aggregate straight `FROM refs.<name>()`.

### Layout

Blocks stack top to bottom. Side by side, they go in a row of columns; spans are out of 12, add up to 12, and
are at least 2 each. Leave blank lines around the tags and the blocks inside them. Rows don't nest, and a column
can hold several blocks; for a tidy row, give each column the same total `rows`.

````md
<columngroup>
<column span="7">

```sql busiest_stations
...
```

</column>
<column span="5">

Text next to the chart.

</column>
</columngroup>
````

## Moving and deleting

`move_file` rewrites the links, `input` paths and `refs` calls pointing at what moved. `delete_file` doesn't:
anything reading a deleted query shows "not found", so check who uses it first.

## DuckDB

- In the browser (WASM) there are no time zones: cast a `TIMESTAMP WITH TIME ZONE` to `TIMESTAMP` (UTC) before
  `::DATE` or `hour()`, and shift by hand: `(ts::TIMESTAMP + INTERVAL 2 HOUR)::DATE`.
- Remote files are read with `FROM 'https://…/file.parquet'` (also `.csv`, `.json`).
- The project's own tables are in the `dash` catalog (schema `main`); data sources are attached as further
  catalogs. `SELECT database_name, schema_name, table_name FROM duckdb_tables()` lists them.
