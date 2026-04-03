'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Info } from 'lucide-react';
import { useWorkflowForm, type WorkflowFormData } from './use-workflow-form.hook';
import { trpc } from '@/lib/trpc';

const TRIGGER_OPERATORS = ['>', '<', '>=', '<=', '==', '!='] as const;
const METRIC_SUGGESTIONS = [
  'wa_response_time_ms',
  'wa_delivery_failure_pct',
  'wa_abandonment_rate',
  'wa_csat_score',
  'wa_api_error_rate',
  'wa_queue_depth',
] as const;

interface WorkflowFormProps {
  initialData?: WorkflowFormData;
}

export function WorkflowForm({ initialData }: WorkflowFormProps = {}) {
  const { form, recipientsField, onSubmit, isLoading, error, isEditMode } = useWorkflowForm({
    initialData,
  });
  const { data: appConfig } = trpc.config.getFeatures.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const emailEnabled = appConfig?.emailEnabled ?? false;
  const { data: users } = trpc.users.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const triggerType = watch('triggerType');

  const handleTriggerTypeChange = (value: 'THRESHOLD' | 'VARIANCE' | '') => {
    if (value === '') {
      setValue('triggerType', undefined);
      setValue('triggerConfig', undefined);
      return;
    }

    setValue('triggerType', value);

    if (value === 'THRESHOLD') {
      setValue('triggerConfig', { type: 'THRESHOLD', metric: '', operator: '>', value: 0 });
    } else {
      setValue('triggerConfig', { type: 'VARIANCE', baseValue: 0, deviationPercentage: 0 });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Workflow' : 'Create Workflow'}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-6">
          {/* Basic fields */}
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

          <Separator />

          {/* Trigger Type */}
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="triggerType"
                  value=""
                  checked={!triggerType}
                  onChange={() => handleTriggerTypeChange('')}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">None</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="triggerType"
                  value="THRESHOLD"
                  checked={triggerType === 'THRESHOLD'}
                  onChange={() => handleTriggerTypeChange('THRESHOLD')}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">Threshold</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="triggerType"
                  value="VARIANCE"
                  checked={triggerType === 'VARIANCE'}
                  onChange={() => handleTriggerTypeChange('VARIANCE')}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm">Variance</span>
              </label>
            </div>
          </div>

          {/* Threshold Config */}
          {triggerType === 'THRESHOLD' && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm font-medium">Threshold Configuration</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="metric">Metric</Label>
                  <Input
                    id="metric"
                    list="metric-suggestions"
                    placeholder="e.g. cpu_usage"
                    {...register('triggerConfig.metric')}
                  />
                  <datalist id="metric-suggestions">
                    {METRIC_SUGGESTIONS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="operator">Operator</Label>
                  <select
                    id="operator"
                    className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                    {...register('triggerConfig.operator')}
                  >
                    {TRIGGER_OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="number"
                    {...register('triggerConfig.value', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Variance Config */}
          {triggerType === 'VARIANCE' && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm font-medium">Variance Configuration</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="baseValue">Base Value</Label>
                  <Input
                    id="baseValue"
                    type="number"
                    {...register('triggerConfig.baseValue', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deviationPercentage">Deviation %</Label>
                  <Input
                    id="deviationPercentage"
                    type="number"
                    min={0}
                    {...register('triggerConfig.deviationPercentage', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Output Message */}
          <div className="space-y-2">
            <Label htmlFor="outputMessage">Output Message Template</Label>
            <Textarea
              id="outputMessage"
              placeholder="e.g. Alert: {{metric}} reached {{value}}%"
              {...register('outputMessage')}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Use {'{{metric}}'} for metric name and {'{{value}}'} for the value.
            </p>
          </div>

          <Separator />

          {/* Recipients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recipients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => recipientsField.append({ channel: 'IN_APP', destination: '' })}
              >
                Add Recipient
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Info className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {emailEnabled
                  ? 'You will automatically receive notifications via in-app and email when this workflow triggers.'
                  : 'You will automatically receive in-app notifications when this workflow triggers.'}
              </p>
            </div>
            {recipientsField.fields.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                No additional recipients. Only you will be notified.
              </p>
            )}
            {recipientsField.fields.map((field, index) => {
              const channel = watch(`recipients.${index}.channel`);
              const destination = watch(`recipients.${index}.destination`);
              const isEmail = channel === 'EMAIL';
              return (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Channel</Label>
                    <select
                      className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
                      {...register(`recipients.${index}.channel`, {
                        onChange: () => setValue(`recipients.${index}.destination`, ''),
                      })}
                    >
                      <option value="IN_APP">In-App</option>
                      {emailEnabled && <option value="EMAIL">Email</option>}
                    </select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Destination</Label>
                    <select
                      className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={destination}
                      onChange={(e) =>
                        setValue(`recipients.${index}.destination`, e.target.value, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <option value="">Select a user</option>
                      {(users ?? []).map((user) => (
                        <option key={user.id} value={isEmail ? user.email : user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                    onClick={() => recipientsField.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {error && <p className="text-sm text-[var(--destructive)]">{error.message}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEditMode
                ? 'Saving...'
                : 'Creating...'
              : isEditMode
                ? 'Save Changes'
                : 'Create Workflow'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
