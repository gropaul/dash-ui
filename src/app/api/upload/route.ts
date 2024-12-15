import {NextRequest, NextResponse} from "next/server";
import {existsSync} from "fs";
import fs from "fs/promises";
import path from "path";

export interface UploadResponse {
    fileName: string;
    size: number;
    downloadUrl: string;
    lastModified: Date;
}

export interface DeleteRequest {
    fileName: string;
}

export interface DeleteResponse {
    success: boolean;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse | {}>> {
    const formData = await req.formData();

    const f = formData.get("file");

    if (!f) {
        return NextResponse.json({}, {status: 400});
    }

    const file = f as File;

    const destinationDirPath = path.join(process.cwd(), "public/upload");


    const fileArrayBuffer = await file.arrayBuffer();

    if (!existsSync(destinationDirPath)) {
        await fs.mkdir(destinationDirPath, {recursive: true});
    }
    await fs.writeFile(
        path.join(destinationDirPath, file.name),
        Buffer.from(fileArrayBuffer)
    );

    const currentHost = req.headers.get("host");
    const downloadUrl = `http://${currentHost}/upload/${file.name}`;
    return NextResponse.json({
        fileName: file.name,
        size: file.size,
        downloadUrl: downloadUrl,
        lastModified: new Date(file.lastModified),
    });
}

export async function DELETE(req: NextRequest): Promise<NextResponse<DeleteResponse | {}>> {
    const data = await req.json();
    const fileName = data.fileName;

    const filePath = path.join(process.cwd(), "public/upload", fileName);
    if (!existsSync(filePath)) {
        return NextResponse.json({success: false}, {status: 404});
    }

    await fs.unlink(filePath);
    return NextResponse.json({success: true});
}
