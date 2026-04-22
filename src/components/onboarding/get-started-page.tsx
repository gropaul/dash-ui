import React, {useRef} from "react";
import {Upload, BookOpen, Play, Sheet, LayoutDashboard, Workflow, Database} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import {FileTypePill} from "@/components/onboarding/file-type-pill";
import {useOnboardingState} from "@/state/onboarding.state";
import {handleFileDrop} from "@/components/import/file-drop-relation/file-import";
import {FileUploadState} from "@/components/import/file-drop-relation/file-drop-overlay";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {showExampleQueryInternal} from "@/state/init/show-example-query";
import {openCreateCanvasDialog, openCreateDashboardDialog, openCreateRelationDialog} from "@/components/workbench/create-entity-dialogs";

export function GetStartedPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onImportClick = () => {
        fileInputRef.current?.click();
    };

    const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const setUploadState = (_state: FileUploadState) => {};
        await handleFileDrop(files, setUploadState);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onDocsClick = () => {
        window.open('https://www.dash.builders/docs', '_blank');
    };

    const onTourClick = () => {
        useOnboardingState.getState().openWelcomeTour();
    };

    const onNewQuery = () => openCreateRelationDialog();
    const onNewDashboard = () => openCreateDashboardDialog();
    const onNewCanvas = () => openCreateCanvasDialog();

    const onExampleQuery = () => {
        showExampleQueryInternal(MAIN_CONNECTION_ID);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.json,.parquet,.xlsx,.xls,.db,.duckdb,.tsv"
                className="hidden"
                onChange={onFileSelected}
            />

            <div className="flex flex-col items-center max-w-2xl w-full space-y-6">
                <img src="/favicon/web-app-manifest-512x512.png" alt="Dash" className="h-16 w-16"/>
                <h2 className="text-2xl font-bold text-foreground">
                    Welcome to Dash 👋
                </h2>
                <p className="text-muted-foreground max-w-xl text-center">
                    Get started by importing your data, checking out the docs, or taking a quick tour to see the key features.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
                    <Card
                        className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                        onClick={onTourClick}
                    >
                        <CardContent className="flex flex-col items-center text-center p-6 space-y-3">
                            <div className="bg-secondary rounded-xl p-3 group-hover:bg-primary/15 transition-colors">
                                <Play className="h-6 w-6 text-primary group-hover:scale-110 transition-transform"/>
                            </div>
                            <span className="font-semibold text-foreground">Take a Tour</span>
                            <span className="text-sm text-muted-foreground">See the key features</span>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                        onClick={onImportClick}
                    >
                        <CardContent className="flex flex-col items-center text-center p-6 space-y-3">
                            <div className="bg-secondary rounded-xl p-3 transition-colors">
                                <Upload className="h-6 w-6 text-primary group-hover:scale-110 transition-transform"/>
                            </div>
                            <span className="font-semibold text-foreground">Import Files</span>
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                <FileTypePill color="blue">CSV</FileTypePill>
                                <FileTypePill color="emerald">JSON</FileTypePill>
                                <FileTypePill color="amber">XLS</FileTypePill>
                                <FileTypePill color="violet">Parquet</FileTypePill>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                        onClick={onDocsClick}
                    >
                        <CardContent className="flex flex-col items-center text-center p-6 space-y-3">
                            <div className="bg-secondary rounded-xl p-3 transition-colors">
                                <BookOpen className="h-6 w-6 text-primary group-hover:scale-110 transition-transform"/>
                            </div>
                            <span className="font-semibold text-foreground">Documentation</span>
                            <span className="text-sm text-muted-foreground">Learn how to use Dash</span>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-full mt-2">
                    <p className="text-sm text-muted-foreground text-center mb-3">Or start from scratch</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                        <Card
                            className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                            onClick={onNewQuery}
                        >
                            <CardContent className="flex flex-col items-center text-center p-4 space-y-2">
                                <Sheet className="h-5 w-5 text-primary group-hover:scale-110 transition-transform"/>
                                <span className="text-sm font-medium text-foreground">New Query</span>
                            </CardContent>
                        </Card>
                        <Card
                            className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                            onClick={onNewDashboard}
                        >
                            <CardContent className="flex flex-col items-center text-center p-4 space-y-2">
                                <LayoutDashboard className="h-5 w-5 text-primary group-hover:scale-110 transition-transform"/>
                                <span className="text-sm font-medium text-foreground">New Dashboard</span>
                            </CardContent>
                        </Card>
                        <Card
                            className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                            onClick={onNewCanvas}
                        >
                            <CardContent className="flex flex-col items-center text-center p-4 space-y-2">
                                <Workflow className="h-5 w-5 text-primary group-hover:scale-110 transition-transform"/>
                                <span className="text-sm font-medium text-foreground">New Canvas</span>
                            </CardContent>
                        </Card>
                        <Card
                            className="cursor-pointer group hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm"
                            onClick={onExampleQuery}
                        >
                            <CardContent className="flex flex-col items-center text-center p-4 space-y-2">
                                <Database className="h-5 w-5 text-primary group-hover:scale-110 transition-transform"/>
                                <span className="text-sm font-medium text-foreground">Example Query</span>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
