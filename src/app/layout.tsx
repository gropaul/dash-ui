'use client';

import "../styles/globals.css";
import SettingsProvider from "@/components/provider/settings-provider";
import {ThemeProvider} from "@/components/provider/theme-provider";
import {cn} from "@/lib/utils";
import {Toaster} from "sonner";

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
            <div className="w-screen h-screen">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <SettingsProvider>
                        <div className="flex flex-row h-screen w-screen">
                            {children}
                        </div>
                    </SettingsProvider>
                </ThemeProvider>
            </div>
            <Toaster/>
        </main>

        </body>
        </html>
    );
}
