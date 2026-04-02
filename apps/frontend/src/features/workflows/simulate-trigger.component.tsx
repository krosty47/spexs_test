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
}

export function SimulateTrigger({ workflowId }: SimulateTriggerProps) {
  const [metricValue, setMetricValue] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);

  const simulateMutation = trpc.workflows.simulate.useMutation();

  const handleSimulate = () => {
    const value = parseFloat(metricValue);
    if (isNaN(value)) return;
    simulateMutation.mutate({ id: workflowId, metricValue: value, dryRun });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulate Trigger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="metricValue">Metric Value</Label>
            <Input
              id="metricValue"
              type="number"
              placeholder="Enter a numeric value"
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            <span className="text-sm">Dry Run</span>
          </label>
          <Button onClick={handleSimulate} disabled={!metricValue || simulateMutation.isPending}>
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
              {simulateMutation.data.alreadyOpen && <Badge variant="secondary">Already Open</Badge>}
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
      </CardContent>
    </Card>
  );
}
