-- INSTALL httpserver community extension
INSTALL httpserver FROM community;
LOAD httpserver;

-- INSTALL hostfs community extension
INSTALL hostfs FROM community;
LOAD hostfs;

-- MOUNT database
ATTACH '/Users/paul/workspace/duckpgq-experiments/data/SNB1-projected|/snb.duckdb' AS snb;

-- Start a server on port 4200
SELECT httpserve_start('0.0.0.0', 4200);