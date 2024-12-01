

import { NextResponse } from "next/server";

// To handle a GET request to /api
export async function GET(request: any) {
    // Do whatever you want
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

// To handle a POST request to /api
export async function POST(request: any) {
    // Do whatever you want
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}
