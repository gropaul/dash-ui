import React, {useCallback, useEffect, useRef} from "react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronLeft, ChevronRight, Upload, BookOpen} from "lucide-react";
import {useOnboardingState} from "@/state/onboarding.state";
import {TourSlide} from "@/components/onboarding/tour-slide";
import {FileTypePill} from "@/components/onboarding/file-type-pill";
import {handleFileDrop} from "@/components/import/file-drop-relation/file-import";
import {FileUploadState} from "@/components/import/file-drop-relation/file-drop-overlay";
import {cn} from "@/lib/utils";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {DASH_VIDEO_BASE_URL} from "@/platform/global-data";

const TOUR_SLIDES = [
    {
        videoSrc: `${DASH_VIDEO_BASE_URL}/demo_canvas_big_example.mp4`,
        title: "Welcome to Dash 👋",
        description: "Dash is a local-first data exploration tool. Drop in your files, write SQL, and build interactive canvases — everything runs in your browser.",
    },
    {
        videoSrc: `${DASH_VIDEO_BASE_URL}/demo_canvas_different_views.mp4`,
        title: "Explore Any Way You Like",
        description: "Every query node can display its results as a table, chart, or input control. ",
    },
    {
        videoSrc: `${DASH_VIDEO_BASE_URL}/demo_canvas_dependent_table.mp4`,
        title: "Chain Queries Together",
        description: "Canvas nodes can depend on each other using table macros. When you update an upstream node, all downstream nodes update too.",
    },
    {
        videoSrc: `${DASH_VIDEO_BASE_URL}/demo_canvas_dependent_select.mp4`,
        title: "Build Interactive Canvases",
        description: "Downstream nodes will only contain the selected rows of the upstream node. This makes it easy to build interactive canvases.",
    },
];

const TOTAL_SLIDES = TOUR_SLIDES.length + 1; // +1 for the final Get Started slide

export function TourDialog() {
    const isTourOpen = useOnboardingState(s => s.isTourOpen);
    const markAsSeen = useOnboardingState(s => s.markAsSeen);
    const currentSlide = useOnboardingState(s => s.currentSlide);
    const setCurrentSlide = useOnboardingState(s => s.setCurrentSlide);
    const closeTour = useOnboardingState(s => s.closeTour);
    const completeTour = useOnboardingState(s => s.completeTour);
    const isMobile = useIsMobile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [direction, setDirection] = React.useState(1);

    const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

    const goNext = useCallback(() => {
        markAsSeen();
        if (currentSlide < TOTAL_SLIDES - 1) {
            setDirection(1);
            setCurrentSlide(currentSlide + 1);
        }
    }, [currentSlide, setCurrentSlide]);

    const goPrev = useCallback(() => {
        markAsSeen();
        if (currentSlide > 0) {
            setDirection(-1);
            setCurrentSlide(currentSlide - 1);
        }
    }, [currentSlide, setCurrentSlide]);

    const goToSlide = useCallback((index: number) => {
        setDirection(index > currentSlide ? 1 : -1);
        setCurrentSlide(index);
    }, [currentSlide, setCurrentSlide]);

    useEffect(() => {
        if (!isTourOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isTourOpen, goNext, goPrev]);

    const onClose = () => {
        completeTour();
    };

    const onOpenChange = (open: boolean) => {
        if (!open) onClose();
    };

    const onImportClick = () => {
        fileInputRef.current?.click();
    };

    const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const setUploadState = (_state: FileUploadState) => {};
        await handleFileDrop(files, setUploadState);
        if (fileInputRef.current) fileInputRef.current.value = '';
        completeTour();
    };

    const dialogClass = isMobile
        ? "w-full h-full m-0 rounded-none"
        : "w-full max-w-5xl h-[85vh] max-h-[750px]";

    const slideVariants = {
        enter: (dir: number) => ({x: dir > 0 ? 300 : -300, opacity: 0}),
        center: {x: 0, opacity: 1},
        exit: (dir: number) => ({x: dir > 0 ? -300 : 300, opacity: 0}),
    };

    return (
        <Dialog open={isTourOpen} onOpenChange={onOpenChange}>
            <DialogContent className={cn("flex flex-col p-0 gap-0 overflow-hidden", dialogClass)}>
                <DialogTitle className="sr-only">Tour</DialogTitle>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.json,.parquet,.xlsx,.xls,.db,.duckdb,.tsv"
                    className="hidden"
                    onChange={onFileSelected}
                />

                {/* Slide content area */}
                <div className="flex-1 min-h-0 relative overflow-hidden rounded-t-lg">
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                        <motion.div
                            key={currentSlide}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{duration: 0.3, ease: "easeInOut"}}
                            className="absolute inset-0"
                        >
                            {currentSlide < TOUR_SLIDES.length ? (
                                <TourSlide
                                    videoSrc={TOUR_SLIDES[currentSlide].videoSrc}
                                    title={TOUR_SLIDES[currentSlide].title}
                                    description={TOUR_SLIDES[currentSlide].description}
                                    isActive={isTourOpen}
                                />
                            ) : (
                                <FinalSlide
                                    onImportClick={onImportClick}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom bar with dots and navigation */}
                <div className="flex items-center justify-between px-6 py-4 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goPrev}
                        disabled={currentSlide === 0}
                        className="gap-1"
                    >
                        <ChevronLeft className="h-4 w-4"/>
                        Previous
                    </Button>

                    <div className="flex items-center gap-1.5">
                        {Array.from({length: TOTAL_SLIDES}).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goToSlide(i)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-colors",
                                    i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"
                                )}
                            />
                        ))}
                    </div>

                    {isLastSlide ? (
                        <Button size="sm" onClick={onClose}>
                            Get Started
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goNext}
                            className="gap-1"
                        >
                            Next
                            <ChevronRight className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FinalSlide({onImportClick}: { onImportClick: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }, []);

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Background video */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
                <video
                    ref={videoRef}
                    src={`${DASH_VIDEO_BASE_URL}/demo_canvas_big_example.mp4`}
                    crossOrigin="anonymous"
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-20"
                />
            </div>

            {/* Overlay content */}
            <div className="relative flex-1 flex flex-col items-center justify-center space-y-6 z-10">
                <h2 className="text-3xl font-bold text-foreground">
                    Get Started with Dash
                </h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Import your files to start analyzing.{" "}
                    <span className="text-primary">Everything runs locally</span> — Your data stays private.
                </p>

                <div className="flex gap-4 mt-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        onClick={onImportClick}
                    >
                        <Upload className="h-4 w-4"/>
                        Import Data
                        <div className="flex gap-1 ml-1">
                            <FileTypePill color="blue">CSV</FileTypePill>
                            <FileTypePill color="emerald">JSON</FileTypePill>
                            <FileTypePill color="violet">Parquet</FileTypePill>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        onClick={() => window.open('https://www.dash.builders/docs', '_blank')}
                    >
                        <BookOpen className="h-4 w-4"/>
                        Documentation
                    </Button>
                </div>
            </div>
        </div>
    );
}
