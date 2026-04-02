'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface SnoozeDialogProps {
  onSnooze: (until: Date, reason?: string) => void;
  isPending: boolean;
  isSuccess?: boolean;
}

const PRESETS = [
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
  { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
] as const;

export function SnoozeDialog({ onSnooze, isPending, isSuccess }: SnoozeDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customUntil, setCustomUntil] = useState('');
  const [reason, setReason] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Reset internal state after a successful snooze
  useEffect(() => {
    if (isSuccess) {
      setSelectedPreset(null);
      setCustomUntil('');
      setReason('');
      setShowCustom(false);
    }
  }, [isSuccess]);

  const handleConfirm = () => {
    if (showCustom) {
      if (!customUntil) return;
      const until = new Date(customUntil);
      if (until <= new Date()) return;
      onSnooze(until, reason || undefined);
    } else if (selectedPreset !== null) {
      const until = new Date(Date.now() + PRESETS[selectedPreset].ms);
      onSnooze(until, reason || undefined);
    }
  };

  const selectPreset = (index: number) => {
    setSelectedPreset(index);
    setShowCustom(false);
    setCustomUntil('');
  };

  const toggleCustom = () => {
    setShowCustom(!showCustom);
    setSelectedPreset(null);
  };

  const hasSelection = selectedPreset !== null || (showCustom && customUntil);
  const selectionLabel = showCustom
    ? customUntil ? new Date(customUntil).toLocaleString() : null
    : selectedPreset !== null ? PRESETS[selectedPreset].label : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Snooze Event</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset buttons */}
        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, i) => (
              <Button
                key={preset.label}
                variant={selectedPreset === i ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectPreset(i)}
                disabled={isPending}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={showCustom ? 'default' : 'outline'}
              size="sm"
              onClick={toggleCustom}
            >
              Custom
            </Button>
          </div>
        </div>

        {/* Custom datetime */}
        {showCustom && (
          <div className="space-y-2">
            <Label htmlFor="customUntil">Custom Date/Time</Label>
            <Input
              id="customUntil"
              type="datetime-local"
              value={customUntil}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setCustomUntil(e.target.value)}
            />
          </div>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="snoozeReason">Reason (optional)</Label>
          <Textarea
            id="snoozeReason"
            placeholder="Why are you snoozing this event?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Confirm button */}
        <Button
          onClick={handleConfirm}
          disabled={!hasSelection || isPending}
          className="w-full"
        >
          <Clock className="mr-2 h-4 w-4" />
          {isPending
            ? 'Snoozing...'
            : selectionLabel
              ? `Snooze for ${selectionLabel}`
              : 'Select a duration'}
        </Button>
      </CardContent>
    </Card>
  );
}
