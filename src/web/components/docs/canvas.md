---
title: Canvas
description: Arrange queries as nodes on a canvas, running on DuckDB. Nodes read each other with refs, and the ones downstream re-run when a pick upstream changes.
---

# Canvas

A canvas is a `.canvas` file of your project: SQL nodes placed freely, wired together by the queries themselves. Instead of running disconnected queries one by one, you see how the data flows from one to the next, and every node re-runs when something upstream changes. Everything runs on DuckDB, in your browser or in DuckDB itself.

![A canvas of nodes reading each other](https://qfsxxbgzapt0b2kj.public.blob.vercel-storage.com/videos/canvas/demo_canvas_big_example.mp4)

## The toolbar

| Tool | What it does |
|------|-------------|
| **Pointer** | Select, move and resize nodes |
| **Hand** | Pan the canvas without moving nodes |
| **Draw** | Draw with a pen, marker or highlighter |
| **Text** | Add a heading or a note |
| **Table** | Add a query node |
| **Chart** | Add a query node shown as a chart |
| **Link** | Add a button that opens a link |

Click a tool and then the canvas, or drag on the canvas to give the new node its size.

## Query nodes

A query node is a SQL editor with its result below it. Press **Run** or `Cmd/Ctrl + Enter` to run it. The result shows as a table, one of six charts (bar, line, area, scatter, pie, radar), a text with a headline number, a dropdown or a slider; switching the view doesn't run the query again.

![One query node shown as table, chart and text](https://qfsxxbgzapt0b2kj.public.blob.vercel-storage.com/videos/canvas/demo_canvas_different_views.mp4)

## Nodes reading nodes

In its SQL, a node reads another node by its name with `refs.<name>()`:

```sql
SELECT ServiceType, count(DISTINCT TrainNumber) AS num_trains
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE StationName IN (SELECT StationName FROM refs.stations())
GROUP BY ALL
ORDER BY num_trains DESC
```

Dash draws an arrow from `stations` to this node, and runs this node again whenever `stations` ran or its pick changed. Chains can be as long as you like; Dash runs them in order. Instead of typing the ref, drag from one node's edge onto another and Dash writes it into the SQL, or drop it on an empty spot to get a new node reading the first one.

![A node reading another through refs](https://qfsxxbgzapt0b2kj.public.blob.vercel-storage.com/videos/canvas/demo_canvas_dependent_table.mp4)

## Dropdowns filter what follows

A node shown as a dropdown passes on only the rows picked in it, or all rows while nothing is picked. Read it with `refs.<name>()` and every node after it follows the pick: a dashboard built from SQL alone.

![A dropdown filtering the nodes after it](https://qfsxxbgzapt0b2kj.public.blob.vercel-storage.com/videos/canvas/demo_canvas_dependent_select.mp4)

## The file

A canvas is plain text, so it diffs and reviews like code. Each node is a `<node>` with its place and size; a query node holds a named `sql` block, written the same way as on a [page](/docs/dashboards):

````md
<node id="stations" type="query" x="0" y="0" width="520" height="300">

```sql stations
-- view: select
-- column: StationName
SELECT DISTINCT StationName
FROM 'https://example.org/services.parquet'
```

</node>

<node id="title" type="text" x="0" y="-160" width="560" height="120" text-style="h1">

Trains through the Netherlands

</node>
````

Text nodes hold their text, link nodes their label (`type="link"` with an `href`), and drawings their points.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Run the selected node |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + C` / `V` | Copy and paste nodes |
| `Cmd/Ctrl + D` | Duplicate nodes |
| `Delete` / `Backspace` | Delete nodes |
