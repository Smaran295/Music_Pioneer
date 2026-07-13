import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageSrc(url: string | undefined | null, fallback = "/placeholder.svg"): string {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return fallback
  }
  return url
}
