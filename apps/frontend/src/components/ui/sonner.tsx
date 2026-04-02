'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toast provider component using sonner.
 * Add this to the root layout to enable toast() calls throughout the app.
 */
export function Toaster() {
  return <SonnerToaster position="bottom-right" richColors closeButton />;
}
