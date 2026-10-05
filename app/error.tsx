"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      <h1 className="mt-10 text-[22px] font-semibold tracking-[-0.025em]">Something went wrong.</h1>
      <p className="mt-1.5 text-sm text-fg-muted">This page hit an unexpected problem. Your plans are safe.</p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </main>
  );
}
