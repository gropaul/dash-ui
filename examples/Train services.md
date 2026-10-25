# Train services

Every scheduled stop of trains and replacement buses in and around the Netherlands from Monday 15 to Sunday 21 September 2025. Pick a service type to filter the charts; with nothing picked they show all services. Engineering works and replacement buses have a page of their own: [Disruptions](Disruptions.md).

<columngroup>
<column span="8">

```sql week_in_numbers
-- view: text
-- settings: {"titleColumn":"headline","subtitleColumn":"detail"}
-- rows: 3
SELECT format('{:,} stops', count(*)) AS headline,
       format('{} stations, {} operators, {} service types', count(DISTINCT StationName), count(DISTINCT ServiceCompany), count(DISTINCT ServiceType)) AS detail
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
```

</column>
<column span="4">

```sql service_type
-- view: select
-- column: ServiceType
SELECT DISTINCT ServiceType
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
ORDER BY ServiceType
```

</column>
</columngroup>

## Where and who

Utrecht Centraal is the busiest station, ahead of Amsterdam Sloterdijk and Schiphol Airport. NS runs about two thirds of all stops, Arriva most of the rest.

<columngroup>
<column span="7">

```sql busiest_stations
-- view: bar
-- x: StationName
-- y: stops
-- rows: 6
SELECT StationName, count(*) AS stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL
ORDER BY stops DESC
LIMIT 10
```

</column>
<column span="5">

```sql stops_by_operator
-- view: pie
-- x: ServiceCompany
-- y: stops
-- rows: 6
SELECT ServiceCompany, count(*) AS stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL
ORDER BY stops DESC
```

</column>
</columngroup>

## When

Service is close to flat from 8:00 to 19:00, with no sharp rush-hour peak. Saturday has a fifth fewer stops than a weekday, Sunday more than a quarter fewer. Times are local (CEST).

<columngroup>
<column span="7">

```sql stops_per_hour_of_day
-- view: area
-- x: hour
-- y: stops
-- rows: 6
SELECT hour(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR) AS hour, count(*) AS stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY ALL
ORDER BY hour
```

</column>
<column span="5">

```sql stops_per_day
-- view: bar
-- x: day
-- y: stops
-- rows: 6
SELECT dayname(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR) AS day, count(*) AS stops
FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'
WHERE ServiceType IN (SELECT ServiceType FROM refs.service_type())
GROUP BY day, isodow(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR)
ORDER BY isodow(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR)
```

</column>
</columngroup>