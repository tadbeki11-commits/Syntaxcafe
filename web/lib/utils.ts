import { Metadata } from "next";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Orders are keyed by UUID in the backend but staff refer to them by a short
// number. Deterministically fold the UUID into a positive integer for display.
export function uuidToDisplayId(uuid: string | null | undefined): number {
  if (!uuid) return 0;
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function generateMeta({
  title,
  description,
  canonical,
}: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  return {
    title: `${title} - Syntax Cafe system`,
    description: description,
    metadataBase: new URL(`https://syntaxcafe.com`),
    alternates: {
      canonical: `/dashboard${canonical}`,
    },
  };
}
