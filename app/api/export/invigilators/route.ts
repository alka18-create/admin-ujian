import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { formatDate } from "@/utils/dateFormatter";

export async function GET(req: Request) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const { searchParams } = new URL(req.url);
        const examConfigId = searchParams.get("examConfigId");

        if (!examConfigId) {
            return NextResponse.json({ success: false, error: "Exam Config ID is required" }, { status: 400 });
        }

        const invigilators = await prisma.invigilator.findMany({
            where: { examSchedule: { examConfigId } },
            include: { teacher: true, room: true, examSchedule: true },
            orderBy: [{ examSchedule: { date: "asc" } }, { room: { code: "asc" } }],
        });

        if (invigilators.length === 0) {
            return NextResponse.json({ success: false, error: "Belum ada data pengawas" }, { status: 404 });
        }

        // 1. Get unique rooms and sort by code
        const allRoomsMap = new Map<string, { id: string; code: string; name: string }>();
        invigilators.forEach(d => allRoomsMap.set(d.room.id, d.room));
        const uniqueRooms = Array.from(allRoomsMap.values()).sort((a, b) => a.code.localeCompare(b.code));

        // 2. Extract Teacher Codes from the DB output.
        const teacherMap = new Map<string, { name: string; code: string }>();
        invigilators.forEach(d => {
            if (!teacherMap.has(d.teacher.id)) {
                teacherMap.set(d.teacher.id, { name: d.teacher.name, code: d.teacher.code || "-" });
            }
        });

        const uniqueTeacherIds = Array.from(teacherMap.keys()).sort();
        const teacherCodeMap = new Map<string, string>(); // name -> code
        const uniqueTeachers: string[] = [];

        uniqueTeacherIds.forEach(id => {
            const t = teacherMap.get(id)!;
            uniqueTeachers.push(t.name);
            teacherCodeMap.set(t.name, t.code);
        });

        // 3. Group by schedule (Date + Time + Subject) -> Rows
        const scheduleGroups = new Map<string, {
            scheduleId: string;
            date: string;
            time: string;
            subject: string;
            session: number;
            assignments: Record<string, string>; // roomId -> teacher code
        }>();

        invigilators.forEach(d => {
            const schedKey = d.examSchedule.id || `${d.examSchedule.date}-${d.examSchedule.session}`;
            if (!scheduleGroups.has(schedKey)) {
                const timeStr = d.examSchedule.startTime
                    ? d.examSchedule.startTime
                    : (d.examSchedule.session === 1 ? "07:30" : "10:00");

                scheduleGroups.set(schedKey, {
                    scheduleId: schedKey,
                    date: formatDate(d.examSchedule.date),
                    time: timeStr,
                    subject: d.examSchedule.subject,
                    session: d.examSchedule.session,
                    assignments: {}
                });
            }
            scheduleGroups.get(schedKey)!.assignments[d.room.id] = teacherCodeMap.get(d.teacher.name)!;
        });

        const rows = Array.from(scheduleGroups.values());

        // 4. Build Excel Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Jadwal Pengawas");

        // Headers
        const headerColumns = [
            { header: "No", key: "no", width: 5 },
            { header: "Mata Pelajaran", key: "subject", width: 25 },
            { header: "Hari / Tanggal", key: "date", width: 25 },
            { header: "Waktu", key: "time", width: 15 },
            ...uniqueRooms.map(r => ({ header: r.code, key: `room_${r.id}`, width: 12 }))
        ];

        worksheet.columns = headerColumns;

        // Apply style to header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.eachCell((cell: ExcelJS.Cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });

        // Data Rows
        rows.forEach((row, index) => {
            const rowData: Record<string, string | number> = {
                no: index + 1,
                subject: row.subject,
                date: row.date,
                time: row.time,
            };

            uniqueRooms.forEach(r => {
                rowData[`room_${r.id}`] = row.assignments[r.id] || "-";
            });

            const xlRow = worksheet.addRow(rowData);

            xlRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

                // Keep No, 时间, and Room columns centered
                if (colNumber === 1 || colNumber === 4 || colNumber > 4) {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                }
            });
        });

        worksheet.addRow([]); // empty row
        worksheet.addRow([]); // empty row

        // Legend
        const legendStartRow = worksheet.rowCount + 1;
        worksheet.getCell(`A${legendStartRow}`).value = "Daftar Kode Guru";
        worksheet.getCell(`A${legendStartRow}`).font = { bold: true };

        uniqueTeachers.forEach((name, i) => {
            const rowNumber = legendStartRow + 1 + i;
            worksheet.getCell(`A${rowNumber}`).value = teacherCodeMap.get(name) ?? "";
            worksheet.getCell(`B${rowNumber}`).value = name;

            worksheet.getCell(`A${rowNumber}`).font = { bold: true };
            worksheet.getCell(`A${rowNumber}`).alignment = { horizontal: "center" };
        });

        // Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Disposition": `attachment; filename="Jadwal_Pengawas_Ujian.xlsx"`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
