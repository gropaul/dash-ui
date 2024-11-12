-- INSTALL httpserver community extension
INSTALL httpserver FROM community;
LOAD httpserver;

-- INSTALL hostfs community extension
INSTALL hostfs FROM community;
LOAD hostfs;

-- MOUNT database
ATTACH '/Users/paul/workspace/duckpgq-experiments/data/SNB1-projected|/snb.duckdb' AS snb;

-- MOUNT motherduck database
ATTACH 'md:';

-- Start a server on port 4200 with username:password basic auth
-- SELECT httpserve_start('0.0.0.0', 4200, 'username:password');
-- Start a server on port 4200 with token auth
SELECT httpserve_start('0.0.0.0', 4200, 'supersecrettoken');
