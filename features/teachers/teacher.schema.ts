import { z } from "zod";

export const teacherSchema = z.object({
    nip: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    gender: z.enum(["MALE", "FEMALE"], { message: "Pilih jenis kelamin MALE atau FEMALE" }),
    subject: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email("Email tidak valid").optional().or(z.literal("")).nullable(),
    address: z.string().optional().nullable(),
    availableDays: z.string().optional().nullable(),  // e.g. "1,3,4" = Mon,Wed,Thu
    maxSessions: z.coerce.number().int().min(1).optional().nullable(),
    isActive: z.boolean().default(true),
});

export type TeacherInput = z.infer<typeof teacherSchema>;

