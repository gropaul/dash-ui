# Disruptions

Buses replacing trains ("Stopbus ipv trein", "Snelbus ipv trein") point to engineering works. In week 38 of 2025 they cluster in Twente, on the Gooi line and on the Groningen - Leer line into Germany, and almost all of them run on the weekend. The whole week's service is on [Train services](<Train services.md>).

<column_group>
<column span="7">

```sql replacement_bus_stations
-- view: bar
-- x: StationName
-- y: bus_stops
-- rows: 6
SELECT StationName, count(*) AS bus_stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType LIKE '%ipv trein'
GROUP BY ALL
ORDER BY bus_stops DESC
LIMIT 10
```

</column>
<column span="5">

```sql replacement_bus_stops_per_day
-- view: line
-- x: day
-- y: bus_stops
-- rows: 6
SELECT dayname(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR) AS day, count(*) AS bus_stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType LIKE '%ipv trein'
GROUP BY day, isodow(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR)
ORDER BY isodow(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR)
```

</column>
</column_group>

## Replacement services by type

```sql replacement_types
-- view: table
-- rows: 6
SELECT ServiceType, count(*) AS stops, count(DISTINCT StationName) AS stations
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType LIKE '%ipv trein'
GROUP BY ALL
ORDER BY stops DESC
```
