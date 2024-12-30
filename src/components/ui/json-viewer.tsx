export const JsonViewer = ({json, className}: { json: any; className?: string }) => {
    return (
        <code className={`block overflow-auto ${className ?? ""}`}>
            {Object.entries(json).map(([key, value]) => {
                return (
                    <div className="flex pb-1" key={key}>
                        <b className="text-gray-500">{key}:</b>
                        <p className="w-full pl-2 overflow-auto">{value?.toString()}</p>
                    </div>
                );
            })}
        </code>
    );
};