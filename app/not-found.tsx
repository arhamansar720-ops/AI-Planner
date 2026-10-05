import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      <h1 className="mt-10 text-[22px] font-semibold tracking-[-0.025em]">We couldn’t find that.</h1>
      <p className="mt-1.5 text-sm text-fg-muted">The plan may have been deleted, or the link is incorrect.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="primary">
          <Link href="/">
            New plan <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/history">History</Link>
        </Button>
      </div>
    </main>
  );
}
