import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";

    // Prisma v7 mewajibkan driver adapter.
    // Untuk PostgreSQL/Supabase kita pakai @prisma/adapter-pg.
    const adapter = new PrismaPg({ connectionString: dbUrl });

    return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;