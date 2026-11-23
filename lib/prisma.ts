import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";

    // Batasi max koneksi per serverless instance agar tidak memicu
    // EMAXCONNSESSION (max clients reached in session mode) di Supabase Pooler.
    const pool = new Pool({
        connectionString: dbUrl,
        max: Number(process.env.PG_POOL_MAX || 2),
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 15_000,
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
