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

import React, {useState} from 'react';

interface RecursiveJsonViewerProps {
    json: any;
    className?: string;
    depth?: number;
}

export const isObject = (value: any) => typeof value === 'object' && value !== null;

export function RecursiveJsonViewer(props: RecursiveJsonViewerProps) {
    return (
        <RecursiveJsonViewerInternal {...props} isLast={true} depth={0} index={0}/>
    )
}

export interface RecursiveJsonViewerInternalProps {
    json_key?: string;
    json: any;
    className?: string;
    depth?: number;
    index?: number;
    key?: string;
    isLast?: boolean;
}

export function RecursiveJsonViewerInternal(props: RecursiveJsonViewerInternalProps) {

    const {json, className = '', depth = 0} = props;

    const [collapsed, setCollapsed] = useState(true);

    const toggleCollapse = () => setCollapsed(!collapsed);

    // only lists and objects can be collapsed
    if (collapsed && (Array.isArray(json) || isObject(json))) {

        const isObject = !Array.isArray(json);

        let content = JSON.stringify(json);
        if (!props.isLast) {
            content += ',';
        }

        return (
            <div className={`w-full cursor-pointer`}>
                <div onClick={toggleCollapse}>{props.json_key ? '"' + props.json_key + '": ' : ''}{content}</div>
            </div>
        );
    }

    // add color based on depth to className
    let depthColor = 'bg-gray-' + (depth % 9) * 100;
    depthColor = '';
    if (Array.isArray(json)) {
        return (
            <div className={`w-full ${className} ${depthColor}`}>
                <JsonChildWrapper
                    depth={depth}
                    index={props.index}
                    onSeparatorClick={toggleCollapse}
                    json_key={props.json_key}
                    value={json}
                    isLast={props.isLast}
                >
                    {json.map((value, index) => {
                        return <RecursiveJsonViewerInternal
                            json={value}
                            depth={depth + 1}
                            index={index}
                            isLast={index === json.length - 1}
                        />
                    })}
                </JsonChildWrapper>
            </div>
        );
    }

    if (isObject(json)) {

        const keys = Object.keys(json);

        return (
            <JsonChildWrapper
                depth={depth}
                index={props.index}
                onSeparatorClick={toggleCollapse}
                json_key={props.json_key}
                value={json}
                isLast={props.isLast}
            >
                <div className={`w-full ${className} ${depthColor}`}>
                    {keys.map((key, index) => {
                        const value = json[key];
                        return <RecursiveJsonViewerInternal
                            key={key}
                            json_key={key}
                            json={value}
                            index={index}
                            depth={depth + 1}
                            isLast={index === keys.length - 1}
                        />
                    })}
                </div>
            </JsonChildWrapper>
        );
    }
    return (
        <JsonChildWrapper
            depth={depth}
            index={props.index}
            json_key={props.json_key}
            value={json}
            isLast={props.isLast}
        >
            {JSON.stringify(json)}
        </JsonChildWrapper>
    );
}

export interface JsonChildWrapperProps {
    json_key?: string;
    value: any;
    isLast?: boolean;
    onSeparatorClick?: () => void;
    children: React.ReactNode;
    depth?: number;
    index?: number;
}

export function JsonChildWrapper(props: JsonChildWrapperProps) {

    const {json_key, value, children, isLast = false} = props;

    const needsComma = !isLast;

    const keyString = json_key ? ('"' + json_key + '": ') : '';

    const groupName = `group/${props.depth}-${props.index}`;
    const groupHover = groupName + '-hover:text-red-500';
    if (Array.isArray(value)) {
        return (
            <div className={`${groupName}`}>
                <div
                    onClick={props.onSeparatorClick}
                    className="cursor-pointer"
                >{keyString}</div><span className={groupHover}>{'['}</span>
                <div className="pl-4">
                    {children}
                </div>
                <span className={groupHover}>{']'}</span>
                <span>{needsComma && ','}</span>
            </div>
        );
    } else if (isObject(value)) {
        return (
            <div>
                <div
                    onClick={props.onSeparatorClick}
                    className="cursor-pointer"
                >{keyString}{'{'}</div>
                <div className="pl-4">
                    {children}
                </div>
                <div>{'}'}{needsComma && ','} </div>
            </div>
        );
    } else {
        return <div>{keyString}{children}{needsComma && ','}</div>;
    }
}