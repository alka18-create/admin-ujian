import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSchoolIdentity, upsertSchoolIdentity, SchoolIdentityData } from "@/features/school-identity/schoolIdentity.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

// Maximum file size strictly for logo/signature (1MB approx)
const MAX_FILE_SIZE = 1 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string | null> {
    if (!file || file.size === 0) return null;
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} melebihi batas 1MB`);
    if (file.type !== "image/png") throw new Error(`${file.name} harus berformat PNG`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function GET() {
    try {
        const { authorized, response } = await requireAuth();
    if (!authorized) return response;

        const data = await getSchoolIdentity();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, response } = await requireAuth();
    if (!authorized) return response;

        const formData = await req.formData();

        const name = formData.get("name") as string;
        if (!name) return NextResponse.json({ success: false, error: "Nama Madrasah wajib diisi" }, { status: 400 });

        const data: SchoolIdentityData = {
            name,
            npsn: formData.get("npsn") as string || null,
            nsm: formData.get("nsm") as string || null,
            address: formData.get("address") as string || null,
            headmasterName: formData.get("headmasterName") as string || null,
            headmasterNip: formData.get("headmasterNip") as string || null,
        };

        const logoFile = formData.get("logo") as File | null;
        if (logoFile && logoFile.size > 0) {
            data.logo = await fileToBase64(logoFile);
        }

        const signatureFile = formData.get("signature") as File | null;
        if (signatureFile && signatureFile.size > 0) {
            data.signature = await fileToBase64(signatureFile);
        }

        const stampFile = formData.get("stamp") as File | null;
        if (stampFile && stampFile.size > 0) {
            data.stamp = await fileToBase64(stampFile);
        }

        const result = await upsertSchoolIdentity(data);
        return NextResponse.json({ success: true, data: result });

    } catch (error) {
        return handleApiError(error);
    }
}
