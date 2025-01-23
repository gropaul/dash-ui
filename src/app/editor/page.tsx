'use client';

import {useState} from "react";
import EditorJS from "@editorjs/editorjs";
import {H1} from "@/components/ui/typography";
import {Editor} from "@/components/editor/editor";

export default function Page() {
    const [readOnlyState, setReadOnlyState] = useState(false);
    const [editorState, setEditorState] = useState<EditorJS | null>(null);

    return (
        <div className="w-full flex flex-col items-center bg-muted p-8">
            <H1>EditorJS Example</H1>

            <div className="my-4">
                <strong>Read Only: </strong>
                {readOnlyState ? 'On' : 'Off'}
            </div>

            <Editor
                readOnly={readOnlyState}
                onToggleReadOnly={(val) => setReadOnlyState(val)}
            />
        </div>
    );

}
