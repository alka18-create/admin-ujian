import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";

    // Pass PoolConfig langsung ke PrismaPg (tanpa new Pool()) agar tidak
    // terkena mismatch `instanceof Pool` di bundler Next.js/Turbopack.
    // Batasi max koneksi per serverless instance agar tidak memicu
    // EMAXCONNSESSION di Supabase Pooler.
    const adapter = new PrismaPg({
        connectionString: dbUrl,
        max: Number(process.env.PG_POOL_MAX || 2),
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 15_000,
    });

    return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
