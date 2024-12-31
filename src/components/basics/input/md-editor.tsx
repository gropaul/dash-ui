import React, {useState} from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@/styles/md-editor.css';

interface MarkdownEditorProps {
    initialValue?: string;
    onChange?: (value: string | undefined) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({initialValue = '', onChange}) => {
    const [value, setValue] = useState<string | undefined>(initialValue);

    const handleChange = (val: string | undefined) => {
        setValue(val);
        if (onChange) {
            onChange(val);
        }
    };

    return (
        <MDEditor
            value={value}
            onChange={handleChange}
        />
    );
};

export default MarkdownEditor;
