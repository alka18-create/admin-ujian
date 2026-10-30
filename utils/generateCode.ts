export function generateRoomCode(index: number): string {
    return `R${String(index).padStart(2, "0")}`;
}

export function generateStudentCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function generateSeatLabel(row: number, col: number): string {
    const rowLabel = String.fromCharCode(64 + row); // A, B, C, ...
    return `${rowLabel}${col}`;
}
