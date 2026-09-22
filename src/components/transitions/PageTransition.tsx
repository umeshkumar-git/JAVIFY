import React from "react";
import { motion, type Transition } from "framer-motion";
import { cn } from "../../utils/cn";

export interface PageTransitionProps {
  children?: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "none";
}

const transitionConfig: Transition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1], // Smooth cubic bezier (Apple / Material fluid curve)
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  direction = "up",
}) => {
  const getInitialY = () => {
    if (direction === "up") return 14;
    if (direction === "down") return -14;
    return 0;
  };

  const getExitY = () => {
    if (direction === "up") return -10;
    if (direction === "down") return 10;
    return 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: getInitialY(), filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: getExitY(), filter: "blur(4px)" }}
      transition={transitionConfig}
      style={{ willChange: "transform, opacity, filter" }}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
};
