'use client';

import React from "react";
import {PageEditor} from "@/components/page-editor/page-editor";

const FENCE = '```';

// One week (15–21 September 2025) of Dutch train services, one row per stop. The queries shift ArrivalTime
// to Dutch summer time (UTC+2) by hand: DuckDB WASM has no time zone support, so a TIMESTAMP WITH TIME ZONE
// can't be cast to a date or split into hours there, and its plain TIMESTAMP is in UTC.
const SERVICES = `'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet'`;

const SAMPLE_PAGE = `# Train services

One week of Dutch train services, read straight from a Parquet file on GitHub. The page is a markdown file: a chart is a \`sql\` code block with a name, whose leading comments say how to show it, and \`<column span="…">\` tags place blocks side by side on a 12-column grid.

<columngroup>
<column span="7">

${FENCE}sql busiest_stations
-- view: bar
-- x: StationName
-- y: num_services
-- rows: 6
-- Directly query Parquet file from GitHub
SELECT
StationName,
count(*) AS num_services
FROM ${SERVICES}
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 10;
${FENCE}

</column>
<column span="5">

${FENCE}sql services_per_day
-- view: line
-- x: day
-- y: num_services
-- rows: 6
SELECT (ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR)::DATE AS day, count(*) AS num_services
FROM ${SERVICES}
GROUP BY ALL
ORDER BY day
${FENCE}

</column>
</columngroup>

## Operators

<columngroup>
<column span="5">

${FENCE}sql services_by_operator
-- view: pie
-- x: ServiceCompany
-- y: num_services
-- rows: 7
SELECT ServiceCompany, count(*) AS num_services
FROM ${SERVICES}
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 6
${FENCE}

</column>
<column span="7">

- NS serves two thirds of all stops, 249,533 of 378,101, almost all of them Sprinter and Intercity.
- Arriva comes second with 68,872 stops, most of them regional Stoptrein services.
- A weekday has about 58,000 stops; Saturday has 46,640 and Sunday 42,628.

> Between 07:00 and 20:00 every hour has more than 20,000 stops. Between 02:00 and 05:00 there are fewer than 500 an hour.

</column>
</columngroup>

## By service type

Sprinter is the most common service type with 181,050 stops, followed by Stoptrein and Intercity. Pick a type to see when it runs during the day; without a pick the chart shows all of them. The dropdown is a \`sql\` block shown as \`select\`, and the chart reads its rows through \`refs.service_type()\`.

<columngroup>
<column span="3">

${FENCE}sql service_type
-- view: select
-- column: ServiceType
SELECT * FROM ${SERVICES}
${FENCE}

</column>
<column span="9">

${FENCE}sql services_per_hour
-- view: line
-- x: hour
-- y: num_services
-- rows: 6
SELECT hour(ArrivalTime::TIMESTAMP + INTERVAL 2 HOUR) AS hour, count(*) AS num_services
FROM refs.service_type()
GROUP BY ALL
ORDER BY hour
${FENCE}

</column>
</columngroup>

${FENCE}sql busiest_types_and_operators
-- view: table
-- rows: 7
SELECT ServiceType, ServiceCompany, count(*) AS num_services
FROM ${SERVICES}
GROUP BY ALL
ORDER BY num_services DESC
${FENCE}
`;

export function PageEditorDemo() {
    return <PageEditor markdown={SAMPLE_PAGE}/>;
}
