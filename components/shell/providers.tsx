"use client";

import { MotionConfig } from "framer-motion";
import { Tooltip } from "radix-ui";
import { FocusProvider } from "@/components/focus/focus";
import { ToastProvider } from "@/components/ui/toast";
import { useAppearance } from "./appearance";
import { ThemeProvider } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const { motion } = useAppearance();
  return (
    <ThemeProvider>
      {/* Transform/layout animations become fades when the OS, or the Personalize setting, asks for less motion. */}
      <MotionConfig reducedMotion={motion === "reduce" ? "always" : "user"}>
        <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
          <ToastProvider>
            <FocusProvider>{children}</FocusProvider>
          </ToastProvider>
        </Tooltip.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}
