'use client';

import "../styles/globals.css";
import SettingsProvider from "@/components/provider/settings-provider";
import {ThemeProvider} from "@/components/provider/theme-provider";
import {cn} from "@/lib/utils";
import {Toaster} from "sonner";
import {ResponsiveModeProvider} from "@/components/provider/responsive-node-provider";

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <title>Dash</title>
            <meta name="apple-mobile-web-app-title" content="Dash"/>
        </head>
        <body
            className={cn(
                "min-h-screen bg-background antialiased",
            )}
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
                </ThemeProvider>
            </div>
            <Toaster/>
        </main>

        </body>
        </html>
    );
}
