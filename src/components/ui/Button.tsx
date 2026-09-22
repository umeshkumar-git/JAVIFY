import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../utils/cn";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "glass" | "neon" | "elevated" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "glass",
      size = "md",
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
      md: "px-4 py-2.5 text-sm rounded-2xl gap-2",
      lg: "px-6 py-3.5 text-base rounded-2xl gap-2.5 font-semibold",
      icon: "h-10 w-10 p-0 rounded-2xl justify-center items-center",
    }[size];

    const variantClasses = {
      neon: "bg-gradient-to-r from-neon-cyan to-neon-violet text-midnight-950 font-bold shadow-neon-cyan hover:shadow-[0_0_30px_rgba(0,245,255,0.45)] border border-neon-cyan/40",
      primary: "bg-neon-cyan text-midnight-950 font-semibold hover:bg-neon-cyan/90 shadow-glass-sm",
      glass: "bg-glass-surface border border-glass-border hover:border-glass-highlight hover:bg-glass-elevated text-slate-100 backdrop-blur-md shadow-glass-sm",
      elevated: "bg-midnight-850/90 border border-midnight-800 hover:border-midnight-700 hover:bg-midnight-800 text-slate-200 backdrop-blur-lg shadow-glass-lg",
      ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent hover:border-white/5",
      danger: "bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:border-red-500/50 shadow-sm shadow-red-950/40",
    }[variant];

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02, y: -1 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98, y: 0 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {size !== "icon" && <span>Loading...</span>}
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
