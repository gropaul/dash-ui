import {UploadResponse} from "@/app/api/upload/route";


export async function uploadFile(file: File): Promise<UploadResponse> {
    // upload the file using api/upload.ts
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const data = await response.json();
    const downloadUrl = data.downloadUrl;
    const fileName = data.fileName;
    const size = data.size;
    const lastModified = new Date(data.lastModified);

    return {
        fileName,
        size,
        downloadUrl,
        lastModified,
    };
}

export async function deleteFile(fileName: string): Promise<void> {
    const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({fileName}),
    });

    if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
    }
}