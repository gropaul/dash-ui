// MyBlockComponent.tsx
import React, {useEffect, useState} from 'react';
import {Button} from "@/components/ui/button";

export interface MyBlockData {
    count: number;
}

interface MyBlockComponentProps {
    data: MyBlockData;
    readOnly: boolean;
    onDataChange: (newData: MyBlockData) => void;
}

export function MyBlockComponent({
                                     data,
                                     readOnly,
                                     onDataChange,
                                 }: MyBlockComponentProps) {
    const [count, setCount] = useState(data.count || 0);

    /**
     * Whenever `count` changes, notify the parent (Editor.js Tool)
     * so it can store the latest data for `save()`.
     */
    useEffect(() => {
        onDataChange({ count });
    }, [count, onDataChange]);

    return (
        <div>
            <p>Count: {count}</p>
            {/* If readOnly is true, disable the button */}
            <Button onClick={() => setCount((c) => c + 1)} disabled={readOnly}>
                Increment
            </Button>
        </div>
    );
}
