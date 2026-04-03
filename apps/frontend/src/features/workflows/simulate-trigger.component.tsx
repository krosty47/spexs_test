'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge.component';
import { trpc } from '@/lib/trpc';

interface SimulateTriggerProps {
  workflowId: string;
  isActive: boolean;
  hasUnresolvedEvent: boolean;
}

export function SimulateTrigger({
  workflowId,
  isActive,
  hasUnresolvedEvent,
}: SimulateTriggerProps) {
  const [metricValue, setMetricValue] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);
  const simulateMutation = trpc.workflows.simulate.useMutation();

  const handleSimulate = () => {
    const value = parseFloat(metricValue);
    if (isNaN(value)) return;
    simulateMutation.mutate({
      id: workflowId,
      metricValue: value,
      dryRun,
      ...(eventTitle.trim() && !dryRun ? { eventTitle: eventTitle.trim() } : {}),
    });
  };

  const simulateDisabled =
    !metricValue || simulateMutation.isPending || (hasUnresolvedEvent && !dryRun);

  return (
    <Card className={!isActive ? 'opacity-60' : undefined}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Simulate Trigger</CardTitle>
          {!isActive && <StatusBadge status="SNOOZED" label="Workflow Inactive" />}
          {isActive && hasUnresolvedEvent && <StatusBadge status="OPEN" label="Unresolved Event" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isActive ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Activate this workflow to run simulations.
          </p>
        ) : hasUnresolvedEvent ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            An unresolved event already exists for this workflow. Resolve or close it before running
            a new simulation.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="metricValue">Metric Value</Label>
                <Input
                  id="metricValue"
                  type="number"
                  placeholder="Enter a numeric value"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="dryRun" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dryRun" className="cursor-pointer text-sm">
                  Dry Run
                </Label>
              </div>
              <Button onClick={handleSimulate} disabled={simulateDisabled}>
                {simulateMutation.isPending ? 'Simulating...' : 'Simulate'}
              </Button>
            </div>

            {!dryRun && (
              <div className="space-y-1.5">
                <Label htmlFor="eventTitle">Event Title (optional)</Label>
                <Input
                  id="eventTitle"
                  type="text"
                  placeholder="Custom title for the event — defaults to the workflow message"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>
            )}

            {simulateMutation.data && (
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Result:</span>
                  <StatusBadge
                    status={simulateMutation.data.triggered ? 'OPEN' : 'RESOLVED'}
                    label={simulateMutation.data.triggered ? 'Triggered' : 'Not Triggered'}
                  />
                  {simulateMutation.data.dryRun && <StatusBadge status="SNOOZED" label="Dry Run" />}
                </div>
                <p className="text-sm">{simulateMutation.data.message}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {simulateMutation.data.details}
                </p>
              </div>
            )}

            {simulateMutation.error && (
              <p className="text-sm text-[var(--destructive)]">{simulateMutation.error.message}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
