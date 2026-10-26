# Community extensions

Downloads of the DuckDB community extensions, from the weekly statistics published at community-extensions.duckdb.org.

```sql last_week_in_numbers
-- view: text
-- settings: {"titleColumn":"headline","subtitleColumn":"detail"}
-- rows: 3
SELECT format('{:,} downloads last week', sum(downloads)) AS headline,
       format('{} extensions, most downloaded: {}', count(*), arg_max(extension, downloads)) AS detail
FROM (
    UNPIVOT 'https://community-extensions.duckdb.org/downloads-last-week.json'
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
```

## Most downloaded

In the week to 25 October 2026 downloads jumped to about four times the weekly level of the autumn. Most of the jump is `stochastic` and `anofox_forecast`, each up from under 20,000 the week before to over 200,000. Over the year `h3` and `gsheets` lead, with around 4 million downloads each.

<columngroup>
<column span="6">

```sql top_extensions_last_week
-- view: bar
-- x: extension
-- y: downloads
-- rows: 6
SELECT extension, downloads
FROM (
    UNPIVOT 'https://community-extensions.duckdb.org/downloads-last-week.json'
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
ORDER BY downloads DESC
LIMIT 10
```

</column>
<column span="6">

```sql top_extensions_this_year
-- view: bar
-- x: extension
-- y: downloads
-- rows: 6
SELECT extension, sum(downloads) AS downloads
FROM (
    UNPIVOT (
        FROM read_json([
            printf(
                'https://community-extensions.duckdb.org/download-stats-weekly/%s/%s.json',
                week.strftime('%Y'),
                week.strftime('%V').regexp_replace('^0', '')
            )
            FOR week IN range(TIMESTAMP '2026-01-04', now()::TIMESTAMP, INTERVAL 1 WEEK)
            IF strftime(week, '%V') != '53'
        ], union_by_name := true)
    )
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
GROUP BY ALL
ORDER BY downloads DESC
LIMIT 10
```

</column>
</columngroup>

## Per week

Weekly downloads of all extensions grew from about 500,000 in January to about 1.2 million in October.

<columngroup>
<column span="4">

```sql extension
-- view: select
-- column: extension
SELECT extension
FROM (
    UNPIVOT 'https://community-extensions.duckdb.org/downloads-last-week.json'
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
ORDER BY downloads DESC
```

Pick one or more extensions to follow them through the year; with nothing picked the chart shows all extensions together.

</column>
<column span="8">

```sql downloads_per_week
-- view: area
-- x: week
-- y: downloads
-- rows: 6
SELECT _last_update::TIMESTAMP::DATE AS week, sum(downloads) AS downloads
FROM (
    UNPIVOT (
        FROM read_json([
            printf(
                'https://community-extensions.duckdb.org/download-stats-weekly/%s/%s.json',
                week.strftime('%Y'),
                week.strftime('%V').regexp_replace('^0', '')
            )
            FOR week IN range(TIMESTAMP '2026-01-04', now()::TIMESTAMP, INTERVAL 1 WEEK)
            IF strftime(week, '%V') != '53'
        ], union_by_name := true)
    )
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
WHERE extension IN (SELECT extension FROM refs.extension())
GROUP BY ALL
ORDER BY week
```

</column>
</columngroup>

## Week by week

One row per extension, one column per week.

```sql downloads_by_week
-- view: table
-- rows: 8
PIVOT (
    UNPIVOT (
        FROM read_json([
            printf(
                'https://community-extensions.duckdb.org/download-stats-weekly/%s/%s.json',
                week.strftime('%Y'),
                week.strftime('%V').regexp_replace('^0', '')
            )
            FOR week IN range(TIMESTAMP '2026-01-04', now()::TIMESTAMP, INTERVAL 1 WEEK)
            IF strftime(week, '%V') != '53'
        ], union_by_name := true)
    )
    ON COLUMNS(* EXCLUDE _last_update)
    INTO NAME extension VALUE downloads
)
ON _last_update::TIMESTAMP::DATE
USING any_value(downloads)
ORDER BY extension
```
