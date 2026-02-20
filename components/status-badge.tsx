import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
    not_started: {
        label: "Not Started",
        className: "bg-muted text-muted-foreground",
    },
    algorithm_pending: {
        label: "Algorithm Pending",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    algorithm_rejected: {
        label: "Algorithm Rejected",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    coding_stage: {
        label: "Coding Stage",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
    code_submitted: {
        label: "Code Submitted",
        className: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    },
    final_approved: {
        label: "Final Approved",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    pending: {
        label: "Pending Review",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    approved: {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    rejected: {
        label: "Rejected",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
};

export function StatusBadge({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    const config = statusConfig[status] ?? {
        label: status,
        className: "bg-muted text-muted-foreground",
    };

    return (
        <Badge
            variant="secondary"
            className={cn("font-medium border-0", config.className, className)}
        >
            {config.label}
        </Badge>
    );
}
