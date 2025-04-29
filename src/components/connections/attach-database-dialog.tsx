import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {UploadCloud} from "lucide-react";
import {useState} from "react";

export interface DialogResult {
    url: string | null;
    file?: File | null;
}

interface AttachDatabaseDialogProps {
    onClose: () => void;
    onSubmit: (result: DialogResult) => void;
    isOpen: boolean;
}

export function AttachDatabaseDialog({ onClose, onSubmit, isOpen }: AttachDatabaseDialogProps) {
    const initialState: DialogResult = { url: null, file: null };
    const [state, setState] = useState<DialogResult>(initialState);
    const [dragActive, setDragActive] = useState(false);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, url: e.target.value }));
    };

    const handleFileChange = (file: File | null) => {
        setState(prev => ({ ...prev, file }));
        setDragActive(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        handleFileChange(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0] || null;
        handleFileChange(droppedFile);
    };

    const handleSubmit = () => {
        if (!state.url?.trim() && !state.file) {
            alert("Please provide a URL or upload a .db file.");
            return;
        }
        onSubmit(state);
        setState(initialState);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center space-x-2">
                        <DialogTitle className="text-lg font-medium">Attach Database</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-5 mt-4">
                    <div>
                        <Label htmlFor="db-url" className="flex items-center space-x-1 pb-0.5">
                            <span>Database URL</span>
                        </Label>
                        <Input
                            id="db-url"
                            type="url"
                            placeholder="https://blobs.duckdb.org/databases/stations.duckdb"
                            value={state.url || ""}
                            onChange={handleUrlChange}
                            className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">Enter a web-accessible Database URL.</p>
                    </div>

                    <div>
                        <Label htmlFor="db-file" className="flex items-center space-x-1">
                            <span>Upload File</span>
                        </Label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`mt-2 flex items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer ${dragActive ? 'bg-gray-100 border-blue-500' : 'hover:bg-gray-50'}`}
                            onClick={() => document.getElementById('db-file')?.click()}
                        >
                            <UploadCloud className="w-6 h-6 mr-2" />
                            <span className="text-sm text-gray-600">
                                {state.file ? state.file.name : "Click, drag, or drop a database file here"}
                            </span>
                        </div>
                        <Input
                            id="db-file"
                            type="file"
                            accept=".db"
                            onChange={handleInputChange}
                            className="hidden"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="secondary" onClick={onClose} className="mr-2">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}