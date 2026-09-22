import React from "react";
import { useDominantColor } from "../../hooks/useDominantColor";
import { useAudioStore } from "../../store/useAudioStore";

import { cn } from "../../utils/cn";

export interface AmbientBackgroundProps {
  coverUrl?: string | null;
  className?: string;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  coverUrl,
  className,
}) => {
  const currentTrack = useAudioStore((state) => state.currentTrack);
  const targetCover = coverUrl !== undefined ? coverUrl : currentTrack?.coverUrl;

  const { palette } = useDominantColor(targetCover);

  return (
    <div
      aria-hidden="true"
      data-testid="ambient-background"
      className={cn(
        "fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-all duration-1000 ease-out",
        className
      )}
      style={{
        background: palette.gradientCss,
        willChange: "background",
      }}
    >
      {/* Soft Top Radial Glow */}
      <div
        className="absolute -top-[20%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-[140px] opacity-40 transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${palette.primaryHex} 0%, transparent 70%)`,
        }}
      />

      {/* Subtle Secondary Hue Orb */}
      <div
        className="absolute top-[40%] -right-[15%] h-[500px] w-[500px] rounded-full blur-[160px] opacity-25 transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${palette.accentHex} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};
