import { z } from "zod";

export const studentSchema = z.object({
    nis: z.string().min(1, "NIS wajib diisi"),
    nisn: z.string().optional(),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    gender: z.enum(["MALE", "FEMALE"], { message: "Pilih jenis kelamin" }),
    className: z.string().min(1, "Kelas wajib diisi"),
    major: z.enum(["MIPA", "IPS", "KEAGAMAAN"]).optional(),
    phone: z.string().optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;
