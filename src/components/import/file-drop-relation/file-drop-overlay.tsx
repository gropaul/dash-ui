import React from "react";
import {AnimatePresence, motion} from "framer-motion";
import {AlertCircle, CheckCircle, CloudUpload, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {FileFormat} from "@/state/data-source/duckdb-helper";

export interface FileUploadState {
    state: 'idle' | 'hovering' | 'uploading' | 'done' | 'error' | 'format_selection' | 'database_import_selection';
    message?: string;
    file?: File;
}

interface OverlayProps {
    state: FileUploadState;
    onErrorConfirm: () => void;
    onFormatSelect?: (format: FileFormat, file: File) => void;
    onDatabaseImportSelect?: (importType: 'temporary' | 'permanent', file: File) => void;
}

export const FileDropOverlay: React.FC<OverlayProps> = ({state, onErrorConfirm, onFormatSelect, onDatabaseImportSelect}) => (
    <AnimatePresence>
        {state.state !== 'idle' && (
            <motion.div
                className="fixed inset-0 flex items-center justify-center bg-background bg-opacity-80 z-50"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
            >
                <motion.div
                    className="flex flex-col items-center"
                    initial={{scale: 0.8}}
                    animate={{scale: 1}}
                    exit={{scale: 0.8}}
                >
                    {state.state === 'hovering' && (
                        <>
                            <CloudUpload className="w-12 h-12 text-muted-foreground mb-2 animate-pulse"/>
                            <p className="text-foreground">Drop files here</p>
                        </>
                    )}

                    {state.state === 'uploading' && (
                        <>
                            <CloudUpload className="w-12 h-12 text-primary mb-2 animate-spin"/>
                            <p className="text-primary">{state.message}</p>
                        </>
                    )}

                    {state.state === 'done' && (
                        <>
                            <CheckCircle className="w-12 h-12 text-primary mb-2"/>
                            <p className="text-primary">{state.message}</p>
                        </>
                    )}

                    {state.state === 'error' && (
                        <>
                            <AlertCircle className="w-12 h-12 text-destructive mb-2"/>
                            <p className="text-destructive mb-4 max-w-md">{state.message}</p>
                            <Button
                                onClick={onErrorConfirm}
                                variant="destructive"
                            >
                                <XCircle className="w-5 h-5"/>
                                OK
                            </Button>
                        </>
                    )}

                    {state.state === 'format_selection' && state.file && onFormatSelect && (
                        <>
                            <AlertCircle className="w-12 h-12 text-muted-foreground mb-2"/>
                            <p className="text-muted-foreground mb-4">{state.message}</p>
                            <div className="flex flex-col items-center mb-4">
                                <Select
                                    onValueChange={(value) => onFormatSelect(value as FileFormat, state.file!)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="TextSelect a format"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="parquet">Parquet</SelectItem>
                                        <SelectItem value="xlsx">Excel</SelectItem>
                                        <SelectItem value="database">Database</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="h-2"></div>

                                <Button
                                    onClick={onErrorConfirm}
                                    variant="outline"
                                >
                                    <XCircle className="w-5 h-5"/>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}

                    {state.state === 'database_import_selection' && state.file && onDatabaseImportSelect && (
                        <>
                            <AlertCircle className="text-muted-foreground w-12 h-12  mb-2"/>
                            <p className="text-muted-foreground mb-4">{state.message}</p>
                            <div className="flex flex-col items-center space-y-4 mb-6">
                                <div className="flex flex-col space-y-4 w-full max-w-md">
                                    <div
                                        className="flex flex-col items-center text-center border p-4 rounded-xl shadow-sm">
                                        <Button
                                            onClick={() => onDatabaseImportSelect('temporary', state.file!)}
                                            variant="default"
                                            className="px-4 mb-2"
                                        >
                                            Temporary Attachment
                                        </Button>
                                        <p className="text-sm text-muted-foreground">
                                            The data will only be stored temporary. On reloading the page, the database
                                            will be detached.
                                        </p>
                                    </div>
                                    <div
                                        className="flex flex-col items-center text-center border p-4 rounded-xl shadow-sm">
                                        <Button
                                            onClick={() => onDatabaseImportSelect('permanent', state.file!)}
                                            variant="default"
                                            className="px-4 mb-2"
                                        >
                                            Copy into Browser
                                        </Button>
                                        <p className="text-sm text-muted-foreground">
                                            This will copy all tables from the database into the current browser
                                            database. The database will be available on browser reload.
                                        </p>
                                    </div>
                                </div>
                                <Button onClick={onErrorConfirm} variant="outline">
                                    <XCircle className="w-5 h-5 mr-2"/>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}

                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);
