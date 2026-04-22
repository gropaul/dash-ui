import React, {useEffect, useRef} from "react";

interface TourSlideProps {
    videoSrc: string;
    title: string;
    description: string;
    isActive: boolean;
}

export function TourSlide({videoSrc, title, description, isActive}: TourSlideProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isActive]);

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Video area */}
            <div className="flex-1 min-h-0 relative overflow-hidden rounded-lg">
                <video
                    ref={videoRef}
                    src={videoSrc}
                    crossOrigin="anonymous"
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                />
                {/* Bottom gradient fade */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"/>
            </div>
            {/* Text area below video */}
            <div className="px-8 pt-3 pb-5">
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="text-muted-foreground mt-1">{description}</p>
            </div>
        </div>
    );
}
