import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../utils/cn";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: "glass" | "elevated" | "neon-glow" | "subtle";
  interactive?: boolean;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "glass",
      interactive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      glass: "bg-glass-surface/80 border border-glass-border backdrop-blur-xl shadow-glass-sm",
      elevated: "bg-glass-elevated/90 border border-midnight-800 backdrop-blur-2xl shadow-glass-lg",
      "neon-glow": "bg-glass-surface/85 border border-neon-cyan/25 shadow-neon-cyan/20 backdrop-blur-xl",
      subtle: "bg-white/[0.02] border border-white/5 backdrop-blur-md",
    }[variant];

    return (
      <motion.div
        ref={ref}
        whileHover={
          interactive
            ? {
                y: -4,
                scale: 1.01,
                boxShadow: "0 12px 32px 0 rgba(0, 0, 0, 0.5), 0 0 20px -4px rgba(0, 245, 255, 0.2)",
              }
            : undefined
        }
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "rounded-3xl p-6 transition-colors",
          variantClasses,
          interactive && "cursor-pointer hover:border-glass-highlight",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";
