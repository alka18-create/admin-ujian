import { z } from "zod";

export const roomSchema = z.object({
    code: z.string().min(1, "Kode ruang wajib diisi"),
    name: z.string().min(1, "Nama ruang wajib diisi"),
    capacity: z.coerce.number().min(1, "Kapasitas minimal 1").max(50, "Kapasitas maksimal 50"),
    floor: z.coerce.number().default(1),
    building: z.string().optional(),
});

export type RoomInput = z.infer<typeof roomSchema>;
