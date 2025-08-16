


Question: Where should we put the data of relations

Currently, the data is in the `zustand` store and also persisted 
in the database as `JSON`.

Alternative: Have materialized views that hold the data of the view 
and can be computed again and again. In a motherduck wasm environment, 
these views would be on the client side.

When I now want to update the data of the relation.
1. Create a materialized view from the query that holds the data that should be displayed
2. Load the data from the materized view into as JSON.


When I open a dashboard for the first time. 
1. Load the data from the materialized views into the zustand store
2. Ask the user whether he/she wants to update the data of the materialized view (-> rerun the query)

I could have a JSON store with all the data of the relations as a separate store.

Have a relation data manager that
1. At the beginning of the app, loads all the data from the materialized views into the zustand store
2. You give it a query, it (a) creates a MV from the query, (b) loads the data from the MV into the zustand store 
   -> It does not need store the data, as it will be persistet through the MV