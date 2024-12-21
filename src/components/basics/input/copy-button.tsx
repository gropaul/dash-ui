import React from "react";
import {Check, Copy} from "lucide-react";

interface CopyButtonProps {
    textToCopy: string;
    className?: string;
    size?: number;
}

export function CopyButton({textToCopy, className, size = 14}: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`cursor-pointer ${className}`}
        >
            {copied ? (
                <Check className="hover:text-primary text-muted-foreground" size={size}/>
            ) : (
                <Copy className="hover:text-primary text-muted-foreground" size={size}/>
            )}
        </button>
    );
}
