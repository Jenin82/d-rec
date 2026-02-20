import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const steps = [
    { key: "algorithm_submitted", label: "Algorithm Submitted" },
    { key: "algorithm_approved", label: "Approved" },
    { key: "code_submitted", label: "Code Submitted" },
    { key: "final_approved", label: "Final Approved" },
];

const statusToStep: Record<string, number> = {
    not_started: -1,
    algorithm_pending: 0,
    algorithm_rejected: 0,
    coding_stage: 1,
    code_submitted: 2,
    final_approved: 3,
};

export function ProgressTracker({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    const currentStep = statusToStep[status] ?? -1;

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {steps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                    <div key={step.key} className="flex items-center gap-1">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                                    isCompleted
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/30 text-muted-foreground/50",
                                    isCurrent && "ring-2 ring-primary/30 ring-offset-1"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] leading-tight text-center max-w-[72px]",
                                    isCompleted
                                        ? "text-foreground font-medium"
                                        : "text-muted-foreground/60"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 w-8 mb-5 transition-colors",
                                    index < currentStep
                                        ? "bg-primary"
                                        : "bg-muted-foreground/20"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
