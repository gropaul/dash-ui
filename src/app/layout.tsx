'use client';

import {Urbanist} from "next/font/google";
import "./globals.css";
import DuckDbProvider from "@/components/provider/duck-db-provider";
import ConnectionsProvider from "@/components/provider/connections-provider";

const urbanist = Urbanist({subsets: ["latin"]});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={urbanist.className}>
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
