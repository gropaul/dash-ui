# App Initialization

The initialization process of the app consists of multiple dependent steps:

---

## 1. Database Connections
**Location:** Local Storage (Browser)  
**File:** `connections.state.ts`

1. Load the saved connections from storage.
2. Check if there is a valid connection to **DuckDB**.
3. If not, prompt the user to create a new connection.

---

## 2. Relations State
**Location:** DuckDB  
**File:** `relations.state.ts`

- Load the available **dashboards/dataviews** stored in the DuckDB database.

---

## 3. GUI State
**Location:** Local Storage (Browser)  
**File:** `gui.state.ts`

- Load the dashboards/dataviews currently open in the GUI.
- Delete any views that have been removed from the DuckDB database.  
