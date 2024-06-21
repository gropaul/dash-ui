#!/bin/bash

# Define the base URL for the downloads
BASE_URL="https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist"

# Define the filenames to be downloaded
FILES=(
  "duckdb-mvp.wasm"
  "duckdb-browser-mvp.worker.js"
  "duckdb-eh.wasm"
  "duckdb-browser-eh.worker.js"
)

# Loop through each file and download it
for FILE in "${FILES[@]}"; do
  echo "Downloading $FILE..."
  curl -O "$BASE_URL/$FILE"
done

echo "All files downloaded successfully."
