'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkflowSchema, type CreateWorkflowInput } from '@workflow-manager/shared';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

export interface WorkflowFormData {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  triggerType?: 'THRESHOLD' | 'VARIANCE' | null;
  triggerConfig?: CreateWorkflowInput['triggerConfig'] | null;
  outputMessage?: string | null;
  recipients: Array<{ channel: 'IN_APP' | 'EMAIL'; destination: string }>;
}

interface UseWorkflowFormOptions {
  initialData?: WorkflowFormData;
}

export function useWorkflowForm(options?: UseWorkflowFormOptions) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditMode = !!options?.initialData;

  const form = useForm<CreateWorkflowInput>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: options?.initialData
      ? {
          name: options.initialData.name,
          description: options.initialData.description ?? '',
          isActive: options.initialData.isActive,
          triggerType: options.initialData.triggerType ?? undefined,
          triggerConfig: options.initialData.triggerConfig ?? undefined,
          outputMessage: options.initialData.outputMessage ?? '',
          recipients: options.initialData.recipients ?? [],
        }
      : {
          name: '',
          description: '',
          isActive: false,
          triggerType: undefined,
          triggerConfig: undefined,
          outputMessage: '',
          recipients: [],
        },
  });

  const recipientsField = useFieldArray({
    control: form.control,
    name: 'recipients',
  });

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      utils.workflows.findAll.invalidate();
      router.push('/workflows');
    },
  });

  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      utils.workflows.findAll.invalidate();
      if (options?.initialData?.id) {
        utils.workflows.findOne.invalidate({ id: options.initialData.id });
      }
      router.push('/workflows');
    },
  });

  const onSubmit = (data: CreateWorkflowInput) => {
    if (isEditMode && options?.initialData?.id) {
      updateMutation.mutate({ id: options.initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeMutation = isEditMode ? updateMutation : createMutation;

  return {
    form,
    recipientsField,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading: activeMutation.isPending,
    error: activeMutation.error,
    isEditMode,
  };
}
