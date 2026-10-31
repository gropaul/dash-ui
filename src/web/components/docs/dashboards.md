---
title: Dashboards in Markdown
description: Write a dashboard with DuckDB as one Markdown file - text, charts, tables and dropdowns as sql blocks, laid out in columns - and edit it as a page in Dash.
---

# Dashboards in Markdown

A dashboard in Dash is a page: one Markdown file with text, and `sql` blocks that show their result as a chart, a table, a number or a dropdown. You edit it like a document, block by block, or as the Markdown itself next to it. The file reads fine without Dash, works in git, and is easy for a coding agent to write.

## Blocks

A `sql` fence with a `view` line is a block that shows data:

````md
```sql busiest_stations
-- view: bar
-- x: StationName
-- y: num_services
SELECT StationName, count(*) AS num_services
FROM 'https://example.org/services.parquet'
GROUP BY ALL ORDER BY num_services DESC LIMIT 10
```
````

The word after `sql` names the block (`busiest_stations`) and is its title, "Busiest stations". The `-- key: value` lines on top say how to show it:

| Key | Meaning |
|---|---|
| `view` | `bar`, `line`, `area`, `scatter`, `pie`, `radar`, `table`, `text`, `select` (a dropdown) or `slider` |
| `x` | A chart's x axis column; for `pie` the slice label |
| `y` | A chart's value columns, comma separated |
| `column` | The column a `select` offers |
| `rows` | Height in rows of 48 px, 6 when left out |
| `input` | A query file to show instead of SQL of its own: `-- input: ../orders.sql` |

## Connecting blocks

A block reads another block of its page with `refs.<name>()`. A dropdown passes on only what is picked, or everything while nothing is, so a dropdown filters every block reading it:

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
SELECT StationName, count(*) AS num_services
FROM 'https://example.org/services.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL ORDER BY num_services DESC LIMIT 10
```
````

Pick a service type and the chart runs again for it. A query saved as a `.sql` file of the project is read the same way, `refs.<file name>()`, from every page; from outside Dash it is the DuckDB macro `dash.refs.<file name>()`.

## Side by side

Blocks stack top to bottom. Put them next to each other in a row of columns, spans out of 12:

````md
<columngroup>
<column span="7">

```sql busiest_stations
...
```

</column>
<column span="5">

Utrecht Centraal is the busiest station, ahead of Amsterdam Sloterdijk.

</column>
</columngroup>
````

## Links between pages

Link another page by its path relative to this one, `[Disruptions](Disruptions.md)`. Renaming or moving a page rewrites the links to it.
