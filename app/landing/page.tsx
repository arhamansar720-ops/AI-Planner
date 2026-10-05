import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { product } from "@/lib/config";

export const metadata: Metadata = {
  title: `${product.name} · ${product.tagline}`,
  description:
    "Describe a goal and watch Forma build the plan live: phases, tasks, dependencies and a timeline, written by an AI that runs on your own device.",
};

export default function LandingPage() {
  return <Landing />;
}
