import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "success" | "warning" | "info" | "neutral";

const toneClasses: Record<Tone, { icon: string; bg: string }> = {
    primary: { icon: "text-[var(--primary-text)]", bg: "bg-[var(--primary-soft)]" },
    success: { icon: "text-[var(--success-text)]", bg: "bg-[var(--success-soft)]" },
    warning: { icon: "text-[var(--warning-text)]", bg: "bg-[var(--warning-soft)]" },
    info: { icon: "text-[var(--info-text)]", bg: "bg-[var(--info-soft)]" },
    neutral: { icon: "text-[var(--text-muted)]", bg: "bg-[var(--bg-surface-hover)]" },
};

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone?: Tone;
    iconColor?: string;
    iconBg?: string;
    trend?: { value: number; label: string };
    suffix?: string;
}

export default function StatCard({
    label,
    value,
    icon: Icon,
    tone = "primary",
    iconColor,
    iconBg,
    trend,
    suffix,
}: StatCardProps) {
    const toneStyle = toneClasses[tone];

    return (
        <div className="card-glass card-hover p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[13px] text-[var(--text-muted)] font-medium leading-5">{label}</span>
                <div className={cn("icon-chip", iconBg ?? toneStyle.bg, iconColor ?? toneStyle.icon)}>
                    <Icon size={18} />
                </div>
            </div>
            <p className="text-[26px] leading-8 font-bold tracking-tight text-[var(--text-main)]">
                {value}
                {suffix && <span className="text-xs font-medium text-[var(--text-muted)] ml-1.5">{suffix}</span>}
            </p>
            {trend && (
                <p
                    className={cn(
                        "text-[11px] font-semibold mt-1",
                        trend.value >= 0 ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"
                    )}
                >
                    {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                </p>
            )}
        </div>
    );
}
