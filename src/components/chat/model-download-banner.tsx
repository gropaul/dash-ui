import React, {useEffect, useState} from "react";
import {Progress} from "@/components/ui/progress";
import {getProviderRegistry} from "@/components/chat/providers";
import {useLanguageModelState} from "@/state/language-model.state";

export function ModelDownloadBanner() {
    const activeProviderId = useLanguageModelState((s) => s.activeProviderId);
    const provider = getProviderRegistry().getProvider(activeProviderId);
    const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!provider?.prepareModel || downloadState !== 'idle') return;

        setDownloadState('downloading');
        setProgress(0);

        provider.prepareModel((p) => {
            setProgress(Math.round(p * 100));
        }).then(() => {
            setDownloadState('done');
        }).catch((e) => {
            setErrorMsg(e instanceof Error ? e.message : 'Download failed');
            setDownloadState('error');
        });
    }, [provider, activeProviderId]);

    if (!provider?.prepareModel) return null;
    if (downloadState === 'idle') return null;

    return (
        <div className="max-w-md mx-auto w-full space-y-1">
            {downloadState === 'downloading' && (
                <>
                    <p className="text-xs text-muted-foreground text-center">
                        Downloading model to run locally in your browser... {progress}%
                    </p>
                    <Progress value={progress} className="h-2"/>
                    <p className="text-xs text-muted-foreground text-center">
                        Your data stays on your device. The model is cached for future sessions.
                    </p>
                </>
            )}
            {downloadState === 'error' && (
                <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}
        </div>
    );
}
