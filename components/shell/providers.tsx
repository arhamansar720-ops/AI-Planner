"use client";

import { MotionConfig } from "framer-motion";
import { Tooltip } from "radix-ui";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* "user" turns transform/layout animations into fades when the OS asks for reduced motion. */}
      <MotionConfig reducedMotion="user">
        <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </Tooltip.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}
