import { useState, useEffect, useCallback } from "react";
import { X, CheckSquare, Square, Loader2, Save } from "lucide-react";

type ClassActivation = {
    className: string;
    isActive: boolean;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AturPesertaDialog({ isOpen, onClose, onSuccess }: Props) {
    const [classes, setClasses] = useState<ClassActivation[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/students/activation");
            const json = await res.json();
            if (json.success) {
                setClasses(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading when dialog opens
            fetchClasses();
        }
    }, [isOpen, fetchClasses]);

    const toggleClass = (className: string) => {
        setClasses(prev =>
            prev.map(c => c.className === className ? { ...c, isActive: !c.isActive } : c)
        );
    };

    const toggleAll = (active: boolean) => {
        setClasses(prev => prev.map(c => ({ ...c, isActive: active })));
    };

    const handleSave = async () => {
        setSaving(true);
        const activeClasses = classes.filter(c => c.isActive).map(c => c.className);

        try {
            const res = await fetch("/api/students/activation", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activeClasses }),
            });
            const json = await res.json();
            if (json.success) {
                onSuccess();
            } else {
                alert(json.error || "Gagal menyimpan");
            }
        } catch {
            alert("Terjadi kesalahan saat menyimpan");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const allSelected = classes.every(c => c.isActive);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-lg mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <CheckSquare size={18} className="text-emerald-400" />
                        <h2 className="text-base font-semibold text-[var(--text-main)]">Atur Peserta Ujian Aktif</h2>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                        Pilih kelas mana saja yang mahasiswanya akan diikutsertakan sebagai peserta ujian. Siswa di kelas yang tidak dicentang akan diabaikan saat pembagian ruang.
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            Belum ada data kelas / siswa.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-[var(--bg-surface-hover)] p-3 rounded-lg border border-[var(--border)]">
                                <span className="text-sm font-medium">Pilih Semua Kelas</span>
                                <button
                                    onClick={() => toggleAll(!allSelected)}
                                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors ${
                                        allSelected 
                                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                                            : "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30"
                                    }`}
                                >
                                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                    {allSelected ? "Batalkan Semua" : "Pilih Semua"}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {classes.map(c => (
                                    <div
                                        key={c.className}
                                        onClick={() => toggleClass(c.className)}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                            c.isActive 
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" 
                                                : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-emerald-500/30 hover:bg-[var(--bg-surface-hover)]"
                                        }`}
                                    >
                                        <span className="text-sm font-medium font-mono">{c.className}</span>
                                        {c.isActive ? <CheckSquare size={18} /> : <Square size={18} className="opacity-50" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-black/20">
                    <div className="text-xs text-[var(--text-muted)]">
                        {classes.filter(c => c.isActive).length} dari {classes.length} kelas terpilih
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="btn-ghost text-sm">
                            Batal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading || classes.length === 0}
                            className="btn-success text-sm flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            {saving ? "Menyimpan..." : "Simpan Pilihan"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
