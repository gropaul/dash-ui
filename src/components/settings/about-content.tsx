import React from "react";
import {Star} from "lucide-react";

export function AboutContent() {

    const baseVersion = process.env.NEXT_PUBLIC_BASE_VERSION ?? '0.0.0';
    const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION ?? '0';
    const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH ?? 'unknown';

    return (
        <div className="p-4">
            <h5 className="text-lg font-bold">About this tool</h5>
            <p className="mb-2">
                Dash is an open source project for exploring and visualizing data using DuckDB.
            </p>
            <p className="py-2">
                Visit our repository: <a
                href="https://github.com/gropaul/dash-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
            >
                github.com/gropaul/dash-ui
            </a>
            </p>
            <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="flex items-center mb-2">
                    <Star className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0"/>
                    <p className="text-sm">
                        If you find Dash helpful, please consider giving our repository a star on GitHub.
                    </p>
                </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
                Version {baseVersion}+{buildVersion} ({commitHash})
            </p>
        </div>
    );
}
