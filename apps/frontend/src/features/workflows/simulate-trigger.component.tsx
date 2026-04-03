'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';

interface SimulateTriggerProps {
  workflowId: string;
  isActive: boolean;
}

export function SimulateTrigger({ workflowId, isActive }: SimulateTriggerProps) {
  const [metricValue, setMetricValue] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);
  const simulateMutation = trpc.workflows.simulate.useMutation();

  const handleSimulate = () => {
    const value = parseFloat(metricValue);
    if (isNaN(value)) return;
    simulateMutation.mutate({ id: workflowId, metricValue: value, dryRun });
  };

  return (
    <Card className={!isActive ? 'opacity-60' : undefined}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Simulate Trigger</CardTitle>
          {!isActive && <Badge variant="secondary">Workflow Inactive</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isActive ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Activate this workflow to run simulations.
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
                <button
                  id="dryRun"
                  type="button"
                  role="switch"
                  aria-checked={dryRun}
                  onClick={() => setDryRun(!dryRun)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
                    dryRun ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      dryRun ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <Label htmlFor="dryRun" className="cursor-pointer text-sm">
                  Dry Run
                </Label>
              </div>
              <Button
                onClick={handleSimulate}
                disabled={!metricValue || simulateMutation.isPending}
              >
                {simulateMutation.isPending ? 'Simulating...' : 'Simulate'}
              </Button>
            </div>

            {simulateMutation.data && (
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Result:</span>
                  <Badge variant={simulateMutation.data.triggered ? 'destructive' : 'secondary'}>
                    {simulateMutation.data.triggered ? 'Triggered' : 'Not Triggered'}
                  </Badge>
                  {simulateMutation.data.dryRun && <Badge variant="outline">Dry Run</Badge>}
                  {simulateMutation.data.alreadyOpen && (
                    <Badge variant="secondary">Already Open</Badge>
                  )}
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
