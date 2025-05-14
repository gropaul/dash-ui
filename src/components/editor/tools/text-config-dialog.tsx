import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { toast } from "sonner";

interface TextSearchConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    textSearchState: {
        value?: string;
        name: string;
    };
    updateTextSearchState: (state: Partial<{ value?: string; name: string }>) => void;
}

export function TextConfigDialog(props: TextSearchConfigDialogProps) {
    const { textSearchState, updateTextSearchState } = props;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard", {
            duration: 2000,
        });
    };

    const exampleQuery = `SELECT '%{{${textSearchState.name}}}%';`;
    
    return (
        <Dialog
            open={props.isOpen}
            onOpenChange={props.onOpenChange}
        >
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Text Input Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Variable Name
                        </Label>
                        <Input
                            id="name"
                            value={textSearchState.name}
                            onChange={(e) => updateTextSearchState({ name: e.target.value })}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current-value" className="text-right">
                            Current Value
                        </Label>
                        <Input
                            id="current-value"
                            value={textSearchState.value || "No search text"}
                            className="col-span-3"
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="usage-example" className="text-right">
                            Usage Example
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="usage-example"
                                value={exampleQuery}
                                className="font-mono"
                                disabled
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                onClick={() => copyToClipboard(exampleQuery)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}