import {useRef, useState} from "react";
import {PlateEditor} from "platejs/react";
import {MarkdownPlugin} from "@platejs/markdown";
import {useCooldown} from "@/components/page-editor/use-cooldown";
import {serializePage} from "@/components/page-editor/markdown";

// How long each side waits after the last change before it updates the other.
const SYNC_COOLDOWN_MS = 700;

/**
 * Keeps the page's markdown text and its document in step in both directions, each after a cooldown.
 * `onChange` receives the markdown whenever its content changes, from either side.
 */
export function useMarkdownSync(editor: PlateEditor, onChange?: (markdown: string) => void) {
    const markdownApi = editor.getApi(MarkdownPlugin).markdown;

    // The text handed to the markdown editor. It changes only when the view writes new markdown or the text
    // is opened, never with the editor's own typing: handing that back races keystrokes typed meanwhile, and
    // the editor then resets to the older text and puts the cursor at the top.
    const [text, setText] = useState(() => serializePage(editor));
    // The latest text from either side, so the text opens on it.
    const latestText = useRef(text);
    const [parseError, setParseError] = useState<string | null>(null);
    // The serialized markdown both sides last agreed on. Comparing against it, instead of the document
    // object, ignores changes that don't alter the markdown: Plate's tidy-up after a text update (block
    // ids) would otherwise echo back and rewrite the text under the cursor.
    const synced = useRef(text);

    const agree = (serialized: string) => {
        synced.current = serialized;
        onChange?.(serialized);
    };

    const textToView = useCooldown((value: string) => {
        try {
            const document = markdownApi.deserialize(value);
            const serialized = serializePage(editor, document);
            setParseError(null);
            if (serialized === synced.current) return;
            agree(serialized);
            editor.tf.setValue(document);
        } catch (e) {
            setParseError(e instanceof Error ? e.message : String(e));
        }
    }, SYNC_COOLDOWN_MS);

    const viewToText = useCooldown(() => {
        const serialized = serializePage(editor);
        if (serialized === synced.current) return;
        agree(serialized);
        latestText.current = serialized;
        setText(serialized);
    }, SYNC_COOLDOWN_MS);

    return {
        text,
        parseError,
        textToView,
        viewToText,
        onTextChange: (value: string) => {
            latestText.current = value;
            textToView.schedule(value);
        },
        onValueChange: () => {
            if (serializePage(editor) !== synced.current) viewToText.schedule(undefined);
        },
        // Starting to edit one side first applies what is still on its way from the other, so neither overwrites the other.
        flushAll: () => {
            textToView.flush();
            viewToText.flush();
        },
        // The markdown editor is about to open: hand it the latest text.
        openText: () => setText(latestText.current),
        // Markdown changed outside the editor, e.g. a block added from the chat; its own changes come back the
        // same and are skipped.
        applyExternal: (value: string) => {
            const document = markdownApi.deserialize(value);
            const serialized = serializePage(editor, document);
            if (serialized === synced.current) return;
            synced.current = serialized;
            latestText.current = serialized;
            setText(serialized);
            editor.tf.setValue(document);
        },
    };
}
