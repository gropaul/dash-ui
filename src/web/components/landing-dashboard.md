




# Dashboards written in Markdown, executed with DuckDB

A dashboard is a page: one Markdown file with text and sql blocks that show their result as a chart, a table, a number or a dropdown. It reads fine without Dash, and a coding agent writes it as easily as you do.



```sql service_type
-- view: select
-- column: ServiceType
SELECT * FROM trains
```

```sql busiest_stations
-- view: bar
-- x: StationName
-- y: stops
SELECT StationName, count(*) AS stops
FROM refs.service_type()
GROUP BY ALL 
ORDER BY stops DESC 
LIMIT 10
```
