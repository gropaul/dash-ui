import React, {useEffect, useState} from "react";
import {Star} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";

const PREVIEW_MODE_KEY = 'dash-preview-mode';

export function getPreviewMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PREVIEW_MODE_KEY) === 'true';
}

export function AboutContent() {

    const baseVersion = process.env.NEXT_PUBLIC_BASE_VERSION ?? '0.0.0';
    const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION ?? '0';
    const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH ?? 'unknown';

    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        setPreviewMode(getPreviewMode());
    }, []);

    function handlePreviewToggle(enabled: boolean) {
        localStorage.setItem(PREVIEW_MODE_KEY, String(enabled));
        setPreviewMode(enabled);
        window.location.reload();
    }

    return (
        <div className="p-4">
            <h5 className="text-lg font-bold">About Dash</h5>
            <p className="">
                Dash is an open source project for exploring and visualizing data using DuckDB.
            </p>
            <p className="py-2">
                Visit our repository: <a
                href="https://github.com/gropaul/dash-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
            >
                github.com/gropaul/dash
            </a>
            </p>
            <div className="p-2 bg-muted rounded-md">
                <div className="flex flex-row items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0"/>
                    <p className="text-sm">
                        We would be grateful if you could give us a star on GitHub.
                    </p>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="preview-toggle" className="text-sm">
                    Preview mode
                </Label>
                <Switch
                    id="preview-toggle"
                    checked={previewMode}
                    onCheckedChange={handlePreviewToggle}
                />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
                Version {baseVersion}+{buildVersion} ({commitHash})
            </p>
        </div>
    );
}
