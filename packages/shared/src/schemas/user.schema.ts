import { z } from 'zod';

export const userListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

export const userListOutputSchema = z.array(userListItemSchema);

export type UserListOutput = z.infer<typeof userListOutputSchema>;
