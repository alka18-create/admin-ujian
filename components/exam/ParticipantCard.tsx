/* eslint-disable @next/next/no-img-element -- print cards use base64/blob images sized by print CSS */

export interface ParticipantCardProps {
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
    visibleFields?: {
        nisn?: boolean;
        nis?: boolean;
        kelas?: boolean;
        ruang?: boolean;
    };
}

export default function ParticipantCard({ student, exam, school, visibleFields }: ParticipantCardProps) {
    const showNisn = visibleFields?.nisn ?? true;
    const showNis = visibleFields?.nis ?? true;
    const showKelas = visibleFields?.kelas ?? true;
    const showRuang = visibleFields?.ruang ?? true;

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null; // Prevent infinite loop if fallback also fails
        target.style.display = 'none';

        // Show the fallback div
        const fallbackId = `fallback-${student.id}`;
        const fallbackEl = document.getElementById(fallbackId);
        if (fallbackEl) fallbackEl.style.display = 'flex';
    };
    return (
        <div className="w-[9.5cm] h-[6.5cm] border border-black p-2.5 relative bg-white flex flex-col items-center justify-between text-black break-inside-avoid shadow-sm print:shadow-none print:border-black">

            {/* HEADER LOGO & KOP */}
            <div className="flex items-center w-full border-b border-black pb-1 mb-1">
                <div className="w-10 h-10 flex items-center justify-center shrink-0 mr-2.5 overflow-hidden">
                    {school?.logo ? (
                        <img src={school.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-md border border-gray-400 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-500">LOGO</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center pr-12">
                    <h2 className="font-bold text-[11px] uppercase leading-tight">
                        {exam?.name ? `KARTU PESERTA ${exam.name}` : "KARTU PESERTA UJIAN"}
                    </h2>
                    <h3 className="font-bold text-[12px] uppercase leading-tight mt-0.5">
                        {school?.name || "NAMA MADRASAH"}
                    </h3>
                    <p className="text-[10px] font-semibold mt-0.5">Tahun Ajaran {exam?.academicYear || "2024/2025"}</p>
                </div>
            </div>

            <div className="flex w-full gap-3 flex-1 mt-0.5">
                {/* Foto Siswa Placeholder & Note */}
                <div className="flex flex-col items-center justify-between shrink-0">
                    <div className="w-[2.8cm] h-[3.8cm] border border-black relative flex flex-col items-center justify-center overflow-hidden">
                        <img
                            src={`/uploads/photos/${student.nisn}.jpg`}
                            alt="Foto"
                            className="w-full h-full object-cover z-10"
                            onError={handleImageError}
                        />

                        <div
                            id={`fallback-${student.id}`}
                            className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-gray-300 translate-y-2">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-[7px] italic font-semibold text-center leading-none mb-1">Harap dibawa selama ujian</p>
                </div>

                {/* Data Siswa */}
                <div className="flex-1 text-[11px] leading-relaxed flex flex-col justify-between">
                    <table className="w-full text-left" style={{ tableLayout: "auto" }}>
                        <tbody>
                            <tr>
                                <td className="whitespace-nowrap w-[3.5rem] font-semibold pb-1 align-top">Nama</td>
                                <td className="w-2 pb-1 align-top">:</td>
                                <td className="pb-1 align-top break-words leading-tight" style={{ maxWidth: "150px" }}>{student.name.toUpperCase()}</td>
                            </tr>
                            {showNisn && (
                                <tr>
                                    <td className="whitespace-nowrap font-semibold pb-0.5 align-top">NISN</td>
                                    <td className="pb-0.5 align-top">:</td>
                                    <td className="pb-0.5 align-top break-words">{student.nisn || '-'}</td>
                                </tr>
                            )}
                            {showNis && (
                                <tr>
                                    <td className="whitespace-nowrap font-semibold pb-0.5 align-top">No.Pes</td>
                                    <td className="pb-0.5 align-top">:</td>
                                    <td className="pb-0.5 align-top break-words">{student.nis}</td>
                                </tr>
                            )}
                            {showKelas && (
                                <tr>
                                    <td className="whitespace-nowrap font-semibold pb-0.5 align-top">Kelas</td>
                                    <td className="pb-0.5 align-top">:</td>
                                    <td className="pb-0.5 align-top break-words font-medium">{student.className}</td>
                                </tr>
                            )}
                            {showRuang && (
                                <tr>
                                    <td className="whitespace-nowrap font-semibold pb-0.5 align-top">Ruang</td>
                                    <td className="pb-0.5 align-top">:</td>
                                    <td className="pb-0.5 font-bold align-top break-words"><span className="text-blue-700 print:text-black">{student.roomName} ({student.roomCode})</span></td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Tanda Tangan */}
                    <div className="mt-0.5 self-end text-left flex flex-col items-start relative">
                        <p className="text-[9px] mb-0.5">Kepala Madrasah,</p>

                        <div className="relative flex items-center h-7 mb-0.5">
                            {/* Optional Signature image */}
                            {school?.signature ? (
                                <img src={school.signature} alt="Tanda Tangan" className="h-7 object-contain mix-blend-multiply relative z-10" />
                            ) : (
                                <div className="h-7"></div>
                            )}

                            {/* Stamp image overlay */}
                            {school?.stamp && (
                                <img 
                                    src={school.stamp} 
                                    alt="Stempel" 
                                    className="absolute -left-5 top-1/2 -translate-y-1/2 h-12 w-12 object-contain opacity-80 z-20 pointer-events-none" 
                                />
                            )}
                        </div>

                        <p className="text-[10px] font-bold underline leading-none">
                            {school?.headmasterName || "H. Kepala Sekolah, M.Pd"}
                        </p>
                        <p className="text-[8px] mt-0.5 leading-none">
                            NIP. {school?.headmasterNip || "19700101 xxxx"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
