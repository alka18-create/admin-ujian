import { z } from "zod";

export const examConfigSchema = z.object({
    name: z.string().min(2, "Nama ujian wajib diisi"),
    academicYear: z.string().min(1, "Tahun ajaran wajib diisi"),
    semester: z.enum(["GANJIL", "GENAP"]),
    startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
    endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
    isActive: z.boolean().default(false),
});

export const examScheduleSchema = z.object({
    examConfigId: z.string().min(1),
    date: z.string().min(1, "Tanggal wajib diisi"),
    session: z.coerce.number().min(1).max(5),
    startTime: z.string().min(1, "Waktu mulai wajib diisi"),
    endTime: z.string().min(1, "Waktu selesai wajib diisi"),
    subject: z.string().min(1, "Mata pelajaran wajib diisi"),
    className: z.string().optional(),
});

export type ExamConfigInput = z.infer<typeof examConfigSchema>;
export type ExamScheduleInput = z.infer<typeof examScheduleSchema>;
