"use client";

import { motion } from "framer-motion";
import { ease } from "@/lib/motion";

/** A short fade between marketing pages. */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.main id="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: ease.expo }}>
      {children}
    </motion.main>
  );
}
