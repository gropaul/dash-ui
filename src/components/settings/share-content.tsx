import React from "react";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Star} from "lucide-react";

export function ShareContent() {
    return (
        <div className="p-4">
            <h5 className="text-lg font-bold">Share Dashboards</h5>
            <p className="text-muted-foreground mb-2">
                Sharing a dashboard is currently not well supported in Dash. This would require some form of
                account management and a backend to store the dashboards, however Dash is purely a frontend
                (at the moment) and does not have any backend capabilities. However, there are a few options:
            </p>
            <h5 className="font-semibold mt-4">1. Share DuckDB File</h5>
            <p className="text-muted-foreground mb-2 mt-1">
                You can share the DuckDB file that contains your dashboard data. This file can be opened in any
                instance of Dash, allowing others to view the same data and dashboards.
            </p>
            <h5 className="font-semibold mt-4">2. Create Share Link for public DuckDB File</h5>
            <p className="text-muted-foreground mb-2 mt-1">
                If the DuckDB file containing your dashboard is available online, you can create a shareable link
                that others can use to access the file.
            </p>
        </div>
    );
}