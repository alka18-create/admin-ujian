import { format, parseISO, isValid } from "date-fns";
import { id } from "date-fns/locale";

export function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "-";
    return format(d, "EEEE, dd MMMM yyyy", { locale: id });
}

export function formatDateShort(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "-";
    return format(d, "dd/MM/yyyy");
}

export function formatDateTime(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "-";
    return format(d, "dd MMMM yyyy, HH:mm", { locale: id });
}

export function formatDay(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "-";
    return format(d, "EEEE", { locale: id });
}

export function toISODateString(date: Date): string {
    return format(date, "yyyy-MM-dd");
}
