'use client';

import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {SideNavBar} from "@/components/layout/side-nav-bar";
import DuckDbProvider from "@/components/utils/duck-db-provider";

const inter = Inter({subsets: ["latin"]});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <main>
            <div className="w-screen h-screen app">
                <DuckDbProvider>
                    <div className="flex flex-row h-screen w-screen">

                        <SideNavBar/>
                        {children}

                    </div>
                </DuckDbProvider>
            </div>

        </main>

        </body>
        </html>
    );
}
