/* eslint-disable @next/next/no-img-element -- print cards use base64/blob images sized by print CSS */

export interface TableCardProps {
    student: {
        id: string;
        nis: string;
        nisn: string | null;
        name: string;
        className: string;
        roomName: string;
        roomCode: string;
        seatLabel: string;
        gender: string;
    };
    exam?: {
        name: string;
        academicYear: string;
        semester: string;
    };
    school?: {
        name: string;
        npsn: string | null;
        nsm: string | null;
        address: string | null;
        headmasterName: string | null;
        headmasterNip: string | null;
        logo: string | null;
        signature: string | null;
        stamp: string | null;
    };
}

export default function TableCard({ student, exam, school }: TableCardProps) {
    return (
        <div className="w-[9.5cm] h-[6.5cm] border border-black p-3 relative bg-white flex flex-col items-center justify-between text-black break-inside-avoid shadow-sm print:shadow-none print:border-black overflow-hidden">

            {/* HEADER LOGO & KOP */}
            <div className="flex items-center w-full border-b border-black pb-1 mb-1">
                <div className="w-10 h-10 flex items-center justify-center shrink-0 mr-2 overflow-hidden">
                    {school?.logo ? (
                        <img src={school.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-md border border-gray-400 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-500">LOGO</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center pr-6">
                    <h2 className="font-bold text-[11px] uppercase leading-tight">
                        {exam?.name ? `KARTU MEJA ${exam.name}` : "KARTU MEJA UJIAN"}
                    </h2>
                    <h3 className="font-bold text-[10px] uppercase leading-tight mt-0.5">
                        {school?.name || "NAMA MADRASAH"}
                    </h3>
                    <p className="text-[8px] font-semibold mt-0.5">Tahun Ajaran {exam?.academicYear || "2024/2025"}</p>
                </div>
            </div>

            {/* KONTEN */}
            <div className="flex flex-col w-full flex-1 mt-1 space-y-1.5 justify-center">
                {/* No. Meja (Seat Label) - BIG & BOLD */}
                <div className="flex flex-col items-center justify-center border-2 border-black py-1.5 rounded-xl bg-gray-50/50">
                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-0.5">Nomor Meja</p>
                    <p className="text-[36px] font-black leading-none">{student.seatLabel}</p>
                </div>

                {/* Data Siswa */}
                <div className="flex flex-col justify-center">
                    <div className="text-center pb-1">
                        <p className="text-[9px] font-bold uppercase text-gray-500 mb-0.5 leading-none">Nama Peserta</p>
                        <p className="text-[13px] font-black uppercase leading-tight line-clamp-2 px-2">
                            {student.name}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-1 border-t border-dashed border-gray-400">
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-500 leading-none mb-0.5">Nomor Peserta</p>
                            <p className="text-[10px] font-bold">{student.nis}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-500 leading-none mb-0.5">Kelas / Ruang</p>
                            <p className="text-[10px] font-bold truncate max-w-[120px]">
                                {student.className} – {student.roomCode}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
