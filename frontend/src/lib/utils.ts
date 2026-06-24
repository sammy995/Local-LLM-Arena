import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui class-name helper.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
