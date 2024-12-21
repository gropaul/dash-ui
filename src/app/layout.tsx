'use client';

import "./globals.css";
import ConnectionsProvider from "@/components/provider/connections-provider";
import {ThemeProvider} from "@/components/provider/theme-provider";
import {cn} from "@/lib/utils";

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body suppressHydrationWarning
          className={cn(
              "min-h-screen bg-background antialiased",
          )}
        >
        <main>
            <div className="w-screen h-screen app">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ConnectionsProvider>
                        <div className="flex flex-row h-screen w-screen">
                            {children}
                        </div>
                    </ConnectionsProvider>
                </ThemeProvider>
            </div>
        </main>

        </body>
        </html>
    );
}
