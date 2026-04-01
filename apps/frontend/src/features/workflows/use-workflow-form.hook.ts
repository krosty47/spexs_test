'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkflowSchema, type CreateWorkflowInput } from '@workflow-manager/shared';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

export function useWorkflowForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<CreateWorkflowInput>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: false,
    },
  });

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      utils.workflows.findAll.invalidate();
      router.push('/workflows');
    },
  });

  const onSubmit = (data: CreateWorkflowInput) => {
    createMutation.mutate(data);
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading: createMutation.isPending,
    error: createMutation.error,
  };
}
