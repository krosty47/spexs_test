import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared horizontal content padding for dashboard pages */
export const CONTENT_PADDING_X = 'px-4 sm:px-6';
