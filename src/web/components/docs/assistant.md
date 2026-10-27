---
title: Agents
description: Let the coding agent you already use - Claude Code, Codex, Gemini CLI, OpenCode or Goose - write queries and pages in your Dash project.
---

# Agents

The desktop app runs a coding agent installed on your machine in a panel next to your project: **Claude Code**, **Codex**, **Gemini CLI**, **OpenCode** or **Goose**. You ask in plain words; the agent explores your data, writes queries and builds pages, and you watch the files change.

## What the agent can do

Dash gives the agent its own MCP server with a few tools:

- **Read and edit files**: the project's pages (`.md`) and queries (`.sql`), with small edits rather than rewrites.
- **Run queries**: read-only SQL against your DuckDB database, also as a block of a given page, to check a query before it goes into a file.
- **The format guide**: how pages, blocks and query files are written, so what it writes opens as you expect.

When the agent answers with data, it writes a block into its reply and Dash shows the chart or table right there in the chat.

## Setting it up

Install the agent's command line tool and log in to it once in a terminal, as you would to use it on its own. Dash finds it on your machine and offers it in the agent panel; the setup steps for each are shown there.

Queries the agent runs through Dash are read-only; changes to your project go through the file tools, so you see each one.
