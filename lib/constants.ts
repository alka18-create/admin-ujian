export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Admin Ujian Sekolah";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const GENDER_LABELS: Record<string, string> = {
    MALE: "Laki-laki",
    FEMALE: "Perempuan",
};

export const SEMESTER_LABELS: Record<string, string> = {
    GANJIL: "Ganjil",
    GENAP: "Genap",
};

export const MAJOR_LABELS: Record<string, string> = {
    MIPA: "MIPA",
    IPS: "IPS",
    KEAGAMAAN: "Keagamaan",
};

export const SESSION_LABELS: Record<number, string> = {
    1: "Sesi 1 (Pagi)",
    2: "Sesi 2 (Siang)",
};

export const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    SUPERADMIN: "Super Admin",
};

export const ITEMS_PER_PAGE = 10;
