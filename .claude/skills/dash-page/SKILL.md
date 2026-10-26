---
name: dash-page
description: Write or edit a Dash page (dashboard) as markdown - text, charts, tables and dropdowns as ```sql blocks, laid out in rows of columns. Use when asked to create, extend or fix a Dash dashboard/page, or to turn a query or analysis into one.
---

# Writing a Dash page

Read `src/state/agent/dash-guide.md` first. It describes pages and query files: the block format, how blocks are
named (only by the word after `sql` on the fence line) and read each other with `refs.<name>()`, the header keys
and `settings`, and the layout. Dash's MCP server hands the same text to agents as its `guide` tool, so keep it
the one place this is written down; `src/state/agent/dash-mcp.test.ts` checks its `settings` examples.

When Dash is running with its MCP server connected, change the project through its tools (`read_file`,
`edit_file`, `query` with `page` to try a block's SQL). Otherwise the format is implemented in
`src/components/page-editor/markdown.ts` and `src/state/workspace/relation-config.ts`, and a full example page is
`SAMPLE_PAGE` in `src/components/demo/page-editor-demo.tsx`.
