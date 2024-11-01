'use client';

import "./globals.css";
import DuckDbProvider from "@/components/provider/duck-db-provider";
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
                    <DuckDbProvider>
                        <div className="flex flex-row h-screen w-screen">
                            {children}
                        </div>
                    </DuckDbProvider>
                </ConnectionsProvider>
            </div>
        </main>

        </body>
        </html>
    );
}
