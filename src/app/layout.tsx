'use client';

import {Urbanist} from "next/font/google";
import "./globals.css";
import DuckDbProvider from "@/components/utils/duck-db-provider";

const urbanist = Urbanist({subsets: ["latin"] });

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
                <DuckDbProvider>
                    <div className="flex flex-row h-screen w-screen">

                        {children}

                    </div>
                </DuckDbProvider>
            </div>

        </main>

        </body>
        </html>
    );
}
