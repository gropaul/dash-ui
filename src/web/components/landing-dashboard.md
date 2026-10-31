




# Dashboards written in Markdown, executed with DuckDB

With Dash, you can build interactive data apps in Markdown. A dashboard is a plain text file: it fits into version
control, reads fine without Dash, and you can write and edit it with your favorite editor or coding agent.

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
