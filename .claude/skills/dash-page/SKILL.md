---
name: dash-page
description: Write or edit a Dash page (dashboard) as markdown - text, charts, tables and dropdowns as ```sql blocks, laid out in rows of columns. Use when asked to create, extend or fix a Dash dashboard/page, or to turn a query or analysis into one.
---

# Writing a Dash page

A Dash page is one markdown file. Text is plain markdown; anything showing data is a ```sql fence with a
name after the language, whose leading `--` comments say how to show it. The format is implemented in `src/components/page-editor/markdown.ts`;
a full example is `SAMPLE_PAGE` in `src/components/demo/page-editor-demo.tsx`.

## Text

Headings `#` to `###`, paragraphs, `-` / `1.` / `- [ ]` lists (indent to nest), `>` quotes, `---` dividers,
`**bold**`, `*italic*`, `` `code` ``, links, and code fences in other languages. No callouts or other MDX tags.
Start with a `#` title: the page's name is only its file name, and a reader without Dash sees the markdown.

Link another page of the project by its path relative to this page, the page's name plus `.md`, in `<…>` when
it has spaces: `[Sales](<../Q3/Sales.md>)`.

## Relation blocks

````md
```sql busiest_stations
-- view: bar
-- x: StationName
-- y: num_services
-- rows: 6
SELECT StationName, count(*) AS num_services
FROM 'https://example.org/services.parquet'
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 10
```
````

The name (`busiest_stations`) is a lowercase SQL identifier, unique on the page. Other blocks read the block by
it, and it is the chart's title and the dropdown's label, shown as "Busiest stations". For a different heading,
write a markdown heading or paragraph above the block. The header ends at the first line that isn't
`-- key: value`; everything after it is the query.

| Key | Meaning |
|---|---|
| `view` | Required. A chart type `bar`, `line`, `area`, `scatter`, `pie`, `radar`, or `table`, `text`, `select`, `slider`. |
| `x` | Column on the x axis (for `pie`: the slice label). |
| `y` | Value column(s), comma separated (for `pie`: the first is the slice size). |
| `column` | For `select`: the column whose values the dropdown offers. |
| `rows` | Height in grid rows of 48px; 6 is a good default for charts and tables. Inputs (`select`, `slider`) have a fixed height; leave it out. |
| `settings` | Optional JSON with the complete view settings (colours, axis options, slider mode). The keys above override it. Leave it out unless you need something they can't say. |

- A comment right under the header must not contain `word:`, or it is read as a header key.
- `text` shows the first row: its first column as title; another title or a subtitle via settings,
  `-- settings: {"titleColumn": "name", "subtitleColumn": "detail"}`.
- `slider` filters the block's rows by a numeric column, set via settings:
  `-- settings: {"column": "price", "mode": "in_range"}` (modes `eq`, `lower`, `higher`, `in_range`, `out_range`).

## Linking blocks (filters)

Every named block is available to the others as `refs.<name>()`. A `select` or `slider` block returns its own rows filtered to
the viewer's pick (all rows when nothing is picked), so charts reading it follow the dropdown:

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

- `IN` needs a subquery returning one column: select the column, not `*`.
- Give a dropdown `SELECT DISTINCT <column>` when other blocks filter with `IN`, so the file isn't read twice.
  Give it the full rows instead when charts aggregate straight `FROM refs.<name>()`.
- A block wins over a project relation of the same name.
- `refs.<name>()` with no block of that name on the page calls the project relation's macro.

## A relation of the project

To show an existing relation, reference it by id instead of writing SQL; it keeps its own query and settings:

````md
```sql
-- relation: relation-query-local-abc123
-- rows: 6
```
````

## Layout

Blocks stack top to bottom. Put blocks side by side in a row of columns; spans are out of 12, sum to 12, and
each is at least 2. Leave blank lines around the tags and around the blocks inside them:

````md
<columngroup>
<column span="7">

```sql
-- view: bar
...
```

</column>
<column span="5">

Some text next to the chart.

</column>
</columngroup>
````

A column can hold several blocks. Rows don't nest. To line up, the blocks of each column should add up to the
same height: e.g. two charts of `rows: 3` next to one of `rows: 6`.

## DuckDB

Queries run in DuckDB, in the browser (WASM) or natively in the desktop app.

- WASM has no time zone support: a `TIMESTAMP WITH TIME ZONE` can't be cast to `DATE` or passed to `hour()`.
  Cast to `TIMESTAMP` first (that is UTC) and shift by hand: `(ts::TIMESTAMP + INTERVAL 2 HOUR)::DATE`.
- Remote files are read with `FROM 'https://…/file.parquet'` (also `.csv`, `.json`).
- Run every query once before putting it on the page, and check the column names used in `x`, `y`, `column`.
