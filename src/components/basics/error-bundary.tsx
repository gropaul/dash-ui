"use client";

import React from "react";
import {TriangleAlert} from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback: (error: Error) => React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {hasError: true, error};
    }

    render() {
        const {hasError, error} = this.state;

        if (hasError && error) {
            return this.props.fallback(error);
        }

        return this.props.children;
    }
}

export interface DefaultErrorBoundaryProps {
    children: React.ReactNode;
}

export function DefaultErrorBoundary(props: DefaultErrorBoundaryProps) {
    return (
        <ErrorBoundary fallback={(error) =>
            <div className="p-4 w-full bg-inherit h-full flex flex-col items-start justify-start">
                <div className={'flex bg-inherit flex-row text-red-500 items-center space-x-2 h-6'}>
                    <TriangleAlert size={16}/>
                    <span>Error rendering view</span>
                </div>
                <div className="mt-2 text-red-500">
                    {error.message}

                </div>
                <div className="mt-2 text-gray-500 text-sm whitespace-pre-wrap">
                    {error.stack}
                </div>
            </div>
        }>
            {props.children}
        </ErrorBoundary>
    );
}