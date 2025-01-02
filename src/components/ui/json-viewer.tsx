export const JsonViewer = ({json, className}: { json: any; className?: string }) => {
    return (
        <div className={`w-full ${className}`}>
            {Object.entries(json).map(([key, value]) => {
                return (
                    <div className="flex pb-1" key={key}>
                        <div className="text-sm text-muted-foreground">{key}:</div>
                        <p className="text-sm w-full pl-2 overflow-auto">{value?.toString()}</p>
                    </div>
                );
            })}
        </div>
    );
};