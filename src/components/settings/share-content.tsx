import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { compressString } from "@/lib/string-compression";


function parseGithubUrl(url: string): string {
    try {
        const parsed = new URL(url);

        if (parsed.hostname !== "github.com") {
            return url; // Not a GitHub URL, return original
        }

        const parts = parsed.pathname.split("/").filter(Boolean);

        if (parts.length < 4) {
            throw new Error("URL does not contain enough parts to form a raw link");
        }

        const [user, repo] = parts;

        // Case 1: URL contains '/blob/' (version 1)
        if (parts[2] === "blob") {
            const branch = parts[3];
            const filePath = parts.slice(4).join("/");
            return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
        }

        // Case 2: Already omits 'blob' (version 2)
        const branch = parts[2];
        const filePath = parts.slice(3).join("/");
        return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    } catch (e) {
        console.error("Invalid GitHub URL:", e);
        return url; // fallback: return original if parsing fails
    }
}

export function ShareContent() {
    const [duckdbLink, setDuckdbLink] = useState<string>("");
    const [shareableLink, setShareableLink] = useState<string>("");
    const [error, setError] = useState<string>("");

    const generateShareableLink = () => {
        if (!duckdbLink) {
            setError("Please enter a link to a DuckDB file");
            toast.error("Please enter a link to a DuckDB file");
            return;
        }

        try {
            // Sanitize the link using parseGithubUrl
            const sanitizedLink = parseGithubUrl(duckdbLink);

            // Use our custom compression function for maximum efficiency
            // This function handles URL encoding internally
            const compressedLink = compressString(sanitizedLink);

            // Generate the shareable link
            const generatedLink = `https://dash.builders?api=wasm&attach=${compressedLink}`;

            setShareableLink(generatedLink);
            setError("");
            toast.success("Shareable link generated successfully!");
        } catch (e) {
            const errorMessage = "Failed to generate shareable link. Please check the URL and try again.";
            setError(errorMessage);
            toast.error(errorMessage);
            console.error("Error generating shareable link:", e);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareableLink)
            .then(() => {
                toast.success("Link copied to clipboard!");
            })
            .catch((err) => {
                console.error("Failed to copy link:", err);
                toast.error("Failed to copy link. Please copy it manually.");
            });
    };

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

            <div className="mt-4 p-4 border rounded-md">
                <h6 className="font-semibold mb-2">Generate Shareable Link</h6>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Enter link to DuckDB file that contains the dashboard:
                        </label>
                        <Input
                            type="text"
                            value={duckdbLink}
                            onChange={(e) => setDuckdbLink(e.target.value)}
                            placeholder="https://github.com/gropaul/dash-ui/blob/main/example/trains.duckdb"
                            className="w-full"
                        />
                    </div>

                    <Button onClick={generateShareableLink}>
                        Generate Shareable Link
                    </Button>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    {shareableLink && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Shareable Link:
                            </label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    value={shareableLink}
                                    readOnly
                                    className="w-full bg-white"
                                />
                                <Button onClick={handleCopyLink} size="sm">
                                    Copy
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
