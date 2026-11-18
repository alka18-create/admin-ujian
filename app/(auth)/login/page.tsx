"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { School, Eye, EyeOff, Loader2, ShieldCheck, CalendarDays, FileCheck2, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Bersihkan parameter ?error=... peninggalan percobaan login sebelumnya,
    // supaya URL tidak terus menampilkan error lama.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const err = params.get("error");
        if (!err) return;

        setError(
            err === "Configuration"
                ? "Konfigurasi server autentikasi bermasalah. Hubungi administrator."
                : "Email atau password salah"
        );
        window.history.replaceState(null, "", "/login");
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            redirectTo: "/dashboard",
        });

        setLoading(false);
        if (result?.error) {
            setError("Email atau password salah");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[var(--bg-base)]">
            {/* Panel brand */}
            <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#141726] p-12 text-white">
                <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#5548e0]/35 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-40 right-0 w-[30rem] h-[30rem] rounded-full bg-[#7c72f5]/25 blur-3xl pointer-events-none" />
                <div
                    className="absolute inset-0 opacity-[0.15] pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "44px 44px",
                        maskImage: "radial-gradient(ellipse at 30% 30%, black, transparent 70%)",
                    }}
                />

                <div className="relative flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#5548e0] flex items-center justify-center shadow-[0_10px_24px_-10px_rgba(85,72,224,.9)]">
                        <School size={22} />
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">Admin Ujian</p>
                        <p className="text-[11px] text-white/55">Panel Administrasi Madrasah</p>
                    </div>
                </div>

                <div className="relative max-w-md">
                    <h2 className="text-[32px] leading-[1.2] font-bold tracking-tight">
                        Administrasi ujian,
                        <br />
                        <span className="text-[#b0a9fb]">tanpa ribet.</span>
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-white/60">
                        Kelola jadwal, pengawas, denah kursi, hingga berita acara dalam satu tempat.
                        Rapi, cepat, dan siap cetak.
                    </p>

                    <div className="mt-9 space-y-4">
                        {[
                            { icon: CalendarDays, title: "Jadwal & pengawas otomatis", desc: "Susun sesi ujian dan bagi pengawas tanpa bentrok." },
                            { icon: FileCheck2, title: "Dokumen siap cetak", desc: "Berita acara, daftar hadir, kartu peserta, dan denah." },
                            { icon: ShieldCheck, title: "Data aman & terpusat", desc: "Tersimpan di cloud, dapat diakses dari mana saja." },
                        ].map((f) => (
                            <div key={f.title} className="flex items-start gap-3.5">
                                <div className="w-9 h-9 rounded-[10px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
                                    <f.icon size={17} className="text-[#b0a9fb]" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-white/90">{f.title}</p>
                                    <p className="text-xs text-white/45 mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-[11px] text-white/35">
                    © {new Date().getFullYear()} Admin Ujian Sekolah · v1.0.0
                </p>
            </div>

            {/* Panel form */}
            <div className="flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-[352px]">
                    {/* Logo mobile */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                            <School size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[var(--text-main)] leading-tight">Admin Ujian</p>
                            <p className="text-[11px] text-[var(--text-muted)]">Panel Administrasi</p>
                        </div>
                    </div>

                    <h1 className="text-[26px] leading-8 font-bold tracking-tight text-[var(--text-main)]">
                        Masuk ke akun Anda
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1.5 mb-7">
                        Gunakan email dan password yang diberikan administrator madrasah.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] px-3.5 py-3 text-[13px] font-medium text-[var(--danger-text)]">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="nama@madrasah.sch.id"
                                autoComplete="username"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="form-label">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-11"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full !py-2.5 !text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Memproses...
                                </>
                            ) : (
                                <>
                                    Masuk <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-7 pt-6 border-t border-[var(--border)]">
                        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                            Lupa password atau mengalami kendala login? Hubungi administrator madrasah
                            untuk pengaturan ulang akun.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
