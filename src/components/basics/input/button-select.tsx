import {ChevronDown} from 'lucide-react';

interface CustomSelectProps {
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    defaultValue?: string;
    title?: string;
    className?: string;
    border?: boolean;
}

export function ButtonSelect({ options, onChange, defaultValue, title, className, border = true }: CustomSelectProps) {

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(event.target.value);
    };

    const borderClass = border ? 'border border-gray-300' : '';

    return (
        <div className={`relative inline-block ${className}`} title={title}>
            {/* Hidden native select */}
            <select
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                defaultValue={defaultValue}
                title="Select View"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {/* Custom dropdown styling */}
            <div
                className={`px-2 py-1 text-sm text-gray-500 rounded-md hover:bg-gray-100 h-8 flex gap-1 items-center justify-between ${borderClass}`}>
                <span>{options.find((option) => option.value === defaultValue)?.label || "Select"}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
        </div>
    );
}
