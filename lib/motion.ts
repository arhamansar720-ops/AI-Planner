import type { Transition, Variants } from "framer-motion";

/**
 * Motion primitives. Every animation in the product draws from these so the
 * whole interface moves with one consistent personality: quick to respond,
 * slow to settle, never bouncy.
 */

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  expo: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const spring = {
  /** Shared-layout travel (prompt → header, canvas → workspace). */
  travel: { type: "spring", stiffness: 140, damping: 24, mass: 1 } satisfies Transition,
  /** Elements snapping into their slot. */
  snap: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } satisfies Transition,
  /** Small tactile feedback (buttons, checkboxes). */
  press: { type: "spring", stiffness: 600, damping: 30 } satisfies Transition,
  /** Gentle settle for panels. */
  soft: { type: "spring", stiffness: 220, damping: 30 } satisfies Transition,
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: ease.out } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: ease.expo } },
  exit: { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.2, ease: ease.out } },
};

export const stagger = (step = 0.04, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});
