-- INSTALL httpserver community extension
INSTALL httpserver FROM community;
LOAD httpserver;

-- INSTALL hostfs community extension
INSTALL hostfs FROM community;
LOAD hostfs;

-- MOUNT database
ATTACH '/Users/paul/workspace/duckpgq-experiments/data/SNB1-projected|/snb.duckdb' AS snb;

-- Mount school database
ATTACH '/Users/paul/WebstormProjects/explorer/data/school.db' AS school;

-- MOUNT motherduck database
ATTACH 'md:';

CREATE TABLE stations AS FROM 's3://duckdb-blobs/stations.parquet';

-- Start a server on port 4200 with username:password basic auth
-- SELECT httpserve_start('0.0.0.0', 4200, 'username:password');
-- Start a server on port 4200 with token auth
SELECT httpserve_start('0.0.0.0', 4200, 'supersecrettoken');
