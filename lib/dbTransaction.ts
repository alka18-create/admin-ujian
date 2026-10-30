import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

type TransactionCallback<T> = (
    tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) => Promise<T>;

export async function dbTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return prisma.$transaction(callback);
}
