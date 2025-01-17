import { useHotkeys } from 'react-hotkeys-hook';

interface StandardShortcuts {
    onDelete?: () => void;
    onBackspace?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onRun?: () => void;
    onEscape?: () => void;
}

export const useStandardShortcuts = (handlers: StandardShortcuts) => {
    const { onDelete, onCopy, onPaste, onRun } = handlers;

    useHotkeys('delete,backspace', onDelete || (() => {}));
    useHotkeys('backspace', handlers.onBackspace || (() => {}));
    useHotkeys('ctrl+c,cmd+c', onCopy || (() => {}));
    useHotkeys('ctrl+v,cmd+v', onPaste || (() => {}));
    useHotkeys('ctrl+enter,cmd+enter', onRun || (() => {}));
    useHotkeys('esc', handlers.onEscape || (() => {}));
}
