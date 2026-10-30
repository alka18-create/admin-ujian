import { prisma } from "@/lib/prisma";

export type SchoolIdentityData = {
    name: string;
    npsn?: string | null;
    nsm?: string | null;
    address?: string | null;
    headmasterName?: string | null;
    headmasterNip?: string | null;
    logo?: string | null;
    signature?: string | null;
    stamp?: string | null;
};

/**
 * Get the school identity. Since there's only one identity per installation,
 * we retrieve the very first record. If not found, returns null.
 */
export async function getSchoolIdentity() {
    return prisma.schoolIdentity.findFirst();
}

/**
 * Creates or updates the singular school identity record.
 */
export async function upsertSchoolIdentity(data: SchoolIdentityData) {
    const existing = await prisma.schoolIdentity.findFirst();

    if (existing) {
        return prisma.schoolIdentity.update({
            where: { id: existing.id },
            data,
        });
    }

    return prisma.schoolIdentity.create({
        data,
    });
}
