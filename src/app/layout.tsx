'use client';

import "./globals.css";
import ConnectionsProvider from "@/components/provider/connections-provider";

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        <main>
            <div className="w-screen h-screen app">
                <ConnectionsProvider>
                    <div className="flex flex-row h-screen w-screen">
                        {children}
                    </div>
                </ConnectionsProvider>
            </div>
        </main>

        </body>
        </html>
    );
}
