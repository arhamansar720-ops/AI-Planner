"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

type Toast = { id: number; message: string; tone: "default" | "error"; action?: { label: string; onClick: () => void } };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { tone: "default", ...t, id }]);
    window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.15 } }}
              transition={spring.snap}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-lg",
                t.tone === "error" && "text-fg",
              )}
            >
              {t.tone === "error" && <span className="size-1.5 rounded-full bg-danger" aria-hidden />}
              <span>{t.message}</span>
              {t.action && (
                <button
                  className="-mr-1 rounded-md px-2 py-0.5 font-medium text-accent hover:bg-accent-soft"
                  onClick={() => {
                    t.action!.onClick();
                    setToasts((all) => all.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
