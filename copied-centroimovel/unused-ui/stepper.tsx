"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepperProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  className?: string;
  onStepClick?: (step: number) => void;
}

export function Stepper({
  steps,
  currentStep,
  className,
  onStepClick,
}: StepperProps) {
  return (
    <nav
      aria-label="Progresso do formulário"
      className={cn(
        "relative flex w-full justify-between items-start pt-2",
        className,
      )}
    >
      {/* Background Progress Line */}
      <div className="absolute top-[20px] left-0 h-[3px] w-full bg-muted/40 rounded-full" />

      {/* Active Progress Line */}
      <motion.div
        className="absolute top-[20px] left-0 h-[3px] bg-primary rounded-full shadow-[0_0_12px_var(--color-primary-foreground)]"
        initial={{ width: "0%" }}
        animate={{
          width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%`,
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />

      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isActive = currentStep === stepNumber;

        const isClickable =
          onStepClick != null && (isCompleted || stepNumber < currentStep);

        return (
          <button
            key={index}
            type="button"
            disabled={!isClickable}
            onClick={() => onStepClick?.(stepNumber)}
            className={cn(
              "relative flex flex-col items-center group z-10",
              isClickable && "cursor-pointer",
              !isClickable && "cursor-default",
            )}
          >
            {/* Step Circle */}
            <motion.div
              initial={false}
              animate={{
                backgroundColor:
                  isCompleted || isActive
                    ? "var(--color-primary)"
                    : "var(--color-card)",
                borderColor:
                  isCompleted || isActive
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                scale: isActive ? 1.05 : 1,
              }}
              whileHover={isClickable ? { scale: 1.1 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-shadow duration-300",
                isActive &&
                  "shadow-brand shadow-glow-sm ring-4 ring-primary/20",
                !isActive && !isCompleted && "text-muted-foreground",
                isCompleted && "text-primary-foreground",
                isActive && "text-primary-foreground",
              )}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Check className="size-5" />
                  </motion.div>
                ) : (
                  <motion.span
                    key="number"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    {stepNumber}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Step Label */}
            <div className="absolute top-12 flex flex-col items-center min-w-[100px]">
              <motion.span
                animate={{
                  color: isActive
                    ? "var(--color-foreground)"
                    : "oklch(var(--muted-foreground))",
                  fontWeight: isActive ? 700 : 500,
                }}
                className={cn(
                  "text-[10px] md:text-sm font-semibold uppercase tracking-wider text-center",
                )}
              >
                {step.label}
              </motion.span>
              {step.description && (
                <span className="hidden md:block text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 opacity-70 border-none">
                  {step.description}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
