import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    try {
        const formData = await req.formData();
        const photos = formData.getAll("photos") as File[];

        if (!photos || photos.length === 0) {
            return NextResponse.json({ success: false, error: "Tidak ada foto yang diunggah" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", "photos");

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        let successCount = 0;
        const errors: string[] = [];

        for (const file of photos) {
            try {
                // Ensure it's a file
                if (!(file instanceof File)) continue;

                // Read the file as ArrayBuffer then convert to Buffer
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                // Get filename
                const filename = file.name;

                // Ensure it has .jpg extension (since ParticipantCard expects .jpg)
                if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
                    errors.push(`File ${filename} ditolak: harus berformat .jpg atau .jpeg`);
                    continue;
                }

                // Determine destination path - ensuring it's named {NISN}.jpg as expected by ParticipantCard
                // Even if original is .jpeg, we save as .jpg for consistency
                const baseName = path.basename(filename, path.extname(filename));
                const destPath = path.join(uploadDir, `${baseName}.jpg`);

                // Write the file
                fs.writeFileSync(destPath, buffer);
                successCount++;
            } catch (err) {
                errors.push(`Gagal memproses file ${file.name}: ${err instanceof Error ? err.message : "kesalahan tidak diketahui"}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                uploaded: successCount,
                errors: errors
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}
