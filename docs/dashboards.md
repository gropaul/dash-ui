# Dash Dashboard Documentation

## What is a Dashboard?

Dashboards in Dash are interactive, composable documents that combine text, data visualizations, and user inputs into a cohesive analytical experience. Think of a dashboard as a canvas where you can tell a data story by mixing explanatory text with live queries, charts, and interactive filters.

Unlike traditional static reports, Dash dashboards are **dynamic** and **interactive**—users can adjust filters and inputs, and all connected queries automatically update to reflect the new selections.

---

## Creating a Dashboard

1. Click "New Dashboard" from the sidebar or command palette
2. Give your dashboard a name
3. Start building by adding blocks

You'll see an editor interface where you can add different types of content blocks.

---

## Adding Blocks to Your Dashboard

Click the **+** button or type **/** to open the block menu. You can add:

### Text & Layout Blocks
- **Headers** (H1-H6): Section titles
- **Paragraph**: Regular text with markdown support
- **Lists**: Bulleted or numbered
- **Code**: Display code snippets
- **Quote**: Highlighted quote blocks
- **Delimiter**: Visual separator lines
- **Tables**: Static data tables
- **Images**: Embed images
- **Links**: Hyperlinks

### Data Blocks
- **Data Table**: Display query results in a table
- **Chart**: Visualize query results (6 chart types available)

### Interactive Input Blocks
- **Select Input**: Dropdown menu populated by a query
- **Fulltext Input**: Text search box

---

# Data Blocks

Data Blocks let you query, explore, and visualize your data directly inside dashboards.
Each block can display results as either a **table** or a **chart**, with flexible configuration options for both.

You can define the query that powers each block using the Query Editor.

## Query Editor

When writing queries in dashboard blocks, you can use the Query Editor, which includes:

- **Syntax highlighting**: SQL keywords are highlighted
- **Auto-completion**: Press Ctrl+Space for suggestions
- **Multiple statements**: Separate queries with semicolons; only the last query's results are displayed
- **Run button**: Execute the query (or Ctrl/Cmd+Enter)
- **Show/Hide query**: Toggle code visibility with "Show Query" / "Hide Query" from the block menu

## Getting Started

When you create a **Data Table** or **Chart Block**, you'll write a SQL query to fetch the data.
- Use the block menu → **"Show Query" / "Hide Query"** to toggle the query editor.
- Click **"Run"** or press **Ctrl/Cmd + Enter** to execute the query.
- The results will appear below the editor and can be displayed as a **table** or a **chart**.

---

## Tables

A Data Table block displays query results in a paginated, interactive table.

The table supports:
- **Sorting:** Click column headers to sort ascending or descending.
- **Resizing:** Drag column edges to adjust width.
- **Copying:** Click any cell to copy its value.

You can use any valid SQL query to fetch and display data in a table.


## Charts

Every Data Table block can be switched to a chart view to visualize your data.
Go to the block menu → **"View as Chart"** to switch from table mode.

### Supported Chart Types

| Chart Type | Best For |
|------------|----------|
| **Line**   | Trends over time or continuous data |
| **Bar**    | Comparing categories |
| **Area**   | Trend visualization with emphasis (filled area) |
| **Scatter**| Relationships and correlations |
| **Pie**    | Proportions and distributions |
| **Radar**  | Multi-dimensional comparisons |

---

### Configuring a Chart

To customize a chart:

1. Switch the block to **"View as Chart"**.
2. Open the menu (⋮) → **"Show Chart Settings"**.
3. Choose chart type, configure axes, colors, and styling.
4. Optionally toggle between **vertical** and **horizontal** layouts.

Charts update automatically whenever their underlying parameters or query results change.

---

## Tips

- Start with a table view to validate your query, then switch to a chart for visualization.
- Use **parameters** in queries to make your blocks interactive.
- Experiment with different chart types to find the clearest way to present your data.

---

# Interactive Elements

Interactive elements are input controls that capture user selections and make them available to all queries in your dashboard. This is what makes dashboards truly dynamic.

## How Interactive Elements Work

Every input element has a **settings icon (⚙️)** that appears when you hover over it.
When you add an interactive element to your dashboard, use the settings to:

1. **You define a query** that populates the input options (for Select) or provides suggestions (for Fulltext)
2. **You give it a variable name** (e.g., `category`, `region`, `product_id`)
3. **You reference that variable** in other queries using `{{variable_name}}`
4. **When the user changes the input**, all queries using that variable automatically re-run with the new value


## Select Input Block

A **Select Input** creates a dropdown menu where users can choose from a list of options.

### Creating a Select Input

1. Add a "Select Input" block to your dashboard
2. Write a SQL query that returns the options:
   ```sql
   SELECT DISTINCT category
   FROM products
   ORDER BY category;
   ```
3. Click the **settings icon** (⚙️) to configure:
   - **Variable Name**: The name you'll use in queries (e.g., `selected_category`)
   - **Placeholder**: Text shown when nothing is selected (e.g., "Choose a category...")
   - **Current Value**: Shows what the user has selected

**If no value is selected, the variable will be empty.**

### Using the Select Input Value in Queries

Once you've created a Select Input with variable name `selected_category`, you can use it in any query with the syntax `{{selected_category}}`.
The selected value will be substituted instead of the placeholder. This means that if your select input is a string, you should include quotes in your query:
If it is a number, you can use it directly without quotes.

```sql
SELECT product_name, price, stock
FROM products
WHERE category = '{{selected_category}}'
ORDER BY price DESC;
```

**How it works:**
- The `{{selected_category}}` placeholder gets replaced with the actual selected value
- When the user selects "Electronics", the query becomes:
  ```sql
  WHERE category = 'Electronics'
  ```
- The query automatically re-runs, and all visualizations update

### Example: Cascading Filters

You can use one Select Input's value in another Select Input's query:

**First Select Input** (`country`):
```sql
SELECT DISTINCT country
FROM stores
ORDER BY country;
```

**Second Select Input** (`city`):
```sql
SELECT DISTINCT city
FROM stores
WHERE country = '{{country}}'
ORDER BY city;
```

**Data Table** using both:
```sql
SELECT store_name, address, manager
FROM stores
WHERE country = '{{country}}'
  AND city = '{{city}}'
ORDER BY store_name;
```

Now when a user selects a country, the city dropdown updates to show only cities in that country, and the table shows stores matching both filters.

---

## Fulltext Input Block

A **Fulltext Input** creates a text search box for free-form text input.

### Creating a Fulltext Input

1. Add a "Fulltext Input" block to your dashboard
2. Optionally write a query for suggestions:
   ```sql
   SELECT DISTINCT product_name
   FROM products
   LIMIT 100;
   ```
3. Configure settings:
   - **Variable Name**: The name you'll use in queries (e.g., `search_term`)
   - **Placeholder**: Hint text (e.g., "Search products...")

### Using Fulltext Input in Queries

Use the variable name with string pattern matching:

```sql
SELECT product_name, category, price
FROM products
WHERE product_name ILIKE '%{{search_term}}%'
   OR description ILIKE '%{{search_term}}%'
ORDER BY product_name;
```

The `ILIKE` operator performs case-insensitive pattern matching, and the `%` wildcards allow matching anywhere in the text.


# Summary

Dashboards in Dash are built from composable blocks. The real power comes from **interactive elements**:

1. **Create input blocks** (Select or Fulltext) and give them variable names
2. **Use `{{variable_name}}` in your queries** to reference the current input value
3. **When users interact with inputs**, all dependent queries automatically re-run

This simple pattern enables you to build sophisticated, interactive analytical experiences without writing a single line of JavaScript—just SQL and dashboard composition.

Start simple, add inputs one at a time, and build up your dashboard iteratively. Happy dashboarding! 🦆
