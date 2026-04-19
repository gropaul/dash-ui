'use client';

import "../styles/globals.css";
import SettingsProvider from "@/components/provider/settings-provider";
import {ThemeProvider} from "@/components/provider/theme-provider";
import {cn} from "@/lib/utils";
import {Toaster} from "sonner";
import {ResponsiveModeProvider} from "@/components/provider/responsive-node-provider";
import {ConditionalAnalytics} from "@/components/conditional-analytics";
import {useEffect} from "react";
import {useOnboardingState} from "@/state/onboarding.state";
import {TourDialog} from "@/components/onboarding/tour-dialog";

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {

    const openTour = useOnboardingState(state => state.openWelcomeTour);
    const hasSeenWelcome = useOnboardingState(state => state.hasSeenWelcome);
    const isTourOpen = useOnboardingState(state => state.isTourOpen);

    useEffect(() => {
        if (!hasSeenWelcome && !isTourOpen) openTour();
    }, [hasSeenWelcome, isTourOpen, openTour]);

    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <title>Dash</title>
            <meta name="apple-mobile-web-app-title" content="Dash"/>
        </head>
        <body
            className={cn(
                "min-100dvh bg-background antialiased",
            )}
            suppressHydrationWarning
        >
        <main>
            <div className="w-full min-h-[100dvh] supports-[height:100dvh]:min-h-dvh">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ResponsiveModeProvider>
                        <SettingsProvider>
                            <div className="flex flex-row min-h-[100dvh] supports-[height:100dvh]:min-h-dvh w-full">
                                {children}
                            </div>
                        </SettingsProvider>
                    </ResponsiveModeProvider>
                    <TourDialog/>
                </ThemeProvider>
            </div>
            <Toaster/>
        </main>
        <ConditionalAnalytics/>
        </body>
        </html>
    );
}
