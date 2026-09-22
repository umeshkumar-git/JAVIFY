import React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "cyan" | "violet" | "pink" | "emerald" | "amber" | "glass";
  withDot?: boolean;
  pulsing?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "cyan",
  withDot = false,
  pulsing = false,
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    cyan: {
      container: "bg-neon-cyan/10 text-cyan-300 border-neon-cyan/25",
      dot: "bg-neon-cyan",
    },
    violet: {
      container: "bg-neon-violet/15 text-purple-300 border-neon-violet/30",
      dot: "bg-neon-violet",
    },
    pink: {
      container: "bg-neon-pink/15 text-pink-300 border-neon-pink/30",
      dot: "bg-neon-pink",
    },
    emerald: {
      container: "bg-neon-emerald/15 text-emerald-300 border-neon-emerald/30",
      dot: "bg-neon-emerald",
    },
    amber: {
      container: "bg-neon-amber/15 text-amber-300 border-neon-amber/30",
      dot: "bg-neon-amber",
    },
    glass: {
      container: "bg-white/5 text-slate-300 border-white/10 backdrop-blur-md",
      dot: "bg-slate-300",
    },
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium backdrop-blur-sm transition-colors",
        variantStyles.container,
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            variantStyles.dot,
            pulsing && "animate-pulse"
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
