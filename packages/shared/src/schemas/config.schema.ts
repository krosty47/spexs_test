import { z } from 'zod';

export const appConfigOutputSchema = z.object({
  emailEnabled: z.boolean(),
});

export type AppConfigOutput = z.infer<typeof appConfigOutputSchema>;
