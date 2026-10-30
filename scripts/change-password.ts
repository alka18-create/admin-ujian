import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

/**
 * Change a user's password from the command line.
 *
 * Usage:
 *   npm run user:password -- admin@school.ac.id "PasswordBaruYangKuat"
 *
 * The password is read from argv (not logged) and stored as a bcrypt hash.
 */
async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error("Usage: npm run user:password -- <email> <new-password>");
        process.exit(1);
    }

    if (password.length < 8) {
        console.error("Password minimal 8 karakter.");
        process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const result = await prisma.user.updateMany({
            where: { email },
            data: { password: await bcrypt.hash(password, 10) },
        });

        if (result.count === 0) {
            console.error(`User dengan email ${email} tidak ditemukan.`);
            process.exitCode = 1;
            return;
        }

        console.log(`✓ Password untuk ${email} berhasil diperbarui.`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
