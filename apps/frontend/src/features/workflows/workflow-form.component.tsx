'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflowForm } from './use-workflow-form.hook';

export function WorkflowForm() {
  const { form, onSubmit, isLoading, error } = useWorkflowForm();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Create Workflow</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Workflow name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-[var(--destructive)]">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-[var(--destructive)]">{errors.description.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error.message}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Workflow'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
