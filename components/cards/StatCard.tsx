import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    trend?: { value: number; label: string };
    suffix?: string;
}

export default function StatCard({
    label,
    value,
    icon: Icon,
    iconColor = "text-blue-400",
    iconBg = "bg-blue-500/10",
    trend,
    suffix,
}: StatCardProps) {
    return (
        <div className="card-glass p-5 hover:border-[var(--primary)] transition-all">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-muted)] font-medium">{label}</span>
                <div className={cn("p-2 rounded-lg", iconBg, iconColor)}>
                    <Icon size={20} />
                </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-main)]">
                {value}
                {suffix && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{suffix}</span>}
            </p>
            {trend && (
                <p
                    className={cn(
                        "text-xs font-bold mt-1 flex items-center gap-1",
                        trend.value >= 0 ? "text-green-600" : "text-red-600"
                    )}
                >
                    {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                </p>
            )}
        </div>
    );
}
