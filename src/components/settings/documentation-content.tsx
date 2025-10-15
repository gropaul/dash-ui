import React from "react";


export function DocumentationContent() {
    return (
        <div className="p-4">
            <h5 className="text-lg font-bold">Documentation</h5>
            <p className="text-muted-foreground mb-2">
                For a complete guide on how to use <strong>Dash</strong>, visit the documentation at:{" "}
                <a
                    href="https://www.dash.builders/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                >
                    Dash Documentation
                </a>.
            </p>
            <p className="text-muted-foreground mb-2">
                To learn more about <strong>DuckDB</strong> and writing <strong>SQL</strong> queries, see the official DuckDB docs:{" "}
                <a
                    href="https://duckdb.org/docs/stable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                >
                    DuckDB Documentation
                </a>.
            </p>
        </div>
    );
}

