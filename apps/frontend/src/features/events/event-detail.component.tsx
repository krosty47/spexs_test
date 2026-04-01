'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const [comment, setComment] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [snoozeReason, setSnoozeReason] = useState('');
  const utils = trpc.useUtils();

  const eventQuery = trpc.events.findOne.useQuery({ id: eventId });

  const resolveMutation = trpc.events.resolve.useMutation({
    onSuccess: () => utils.events.findOne.invalidate({ id: eventId }),
  });

  const snoozeMutation = trpc.events.snooze.useMutation({
    onSuccess: () => {
      utils.events.findOne.invalidate({ id: eventId });
      setSnoozeUntil('');
      setSnoozeReason('');
    },
  });

  const addCommentMutation = trpc.events.addComment.useMutation({
    onSuccess: () => {
      utils.events.findOne.invalidate({ id: eventId });
      setComment('');
    },
  });

  if (eventQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Loading...</p>;
  }

  if (eventQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {eventQuery.error.message}</p>;
  }

  const event = eventQuery.data;
  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{event.title}</h2>
          <p className="text-[var(--muted-foreground)]">Workflow: {event.workflow.name}</p>
        </div>
        <Badge
          variant={
            event.status === 'OPEN'
              ? 'destructive'
              : event.status === 'RESOLVED'
                ? 'default'
                : 'secondary'
          }
        >
          {event.status}
        </Badge>
      </div>

      {/* Actions */}
      {event.status === 'OPEN' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => resolveMutation.mutate({ id: eventId })}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? 'Resolving...' : 'Resolve Event'}
            </Button>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Snooze</p>
              <Input
                type="datetime-local"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
              />
              <Input
                placeholder="Reason (optional)"
                value={snoozeReason}
                onChange={(e) => setSnoozeReason(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() =>
                  snoozeMutation.mutate({
                    id: eventId,
                    until: new Date(snoozeUntil),
                    reason: snoozeReason || undefined,
                  })
                }
                disabled={!snoozeUntil || snoozeMutation.isPending}
              >
                {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payload */}
      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-[var(--muted)] p-4 text-sm">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments ({event.comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.comments.map(
            (c: {
              id: string;
              content: string;
              createdAt: string | Date;
              user: { name: string };
            }) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm">{c.content}</p>
              </div>
            ),
          )}

          <Separator />
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => addCommentMutation.mutate({ eventId, content: comment })}
              disabled={!comment.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {event.history.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No history</p>
          ) : (
            <div className="space-y-2">
              {event.history.map(
                (h: {
                  id: string;
                  action: string;
                  createdAt: string | Date;
                  user: { name: string };
                }) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{h.user.name}</span> {h.action.toLowerCase()}{' '}
                      this event
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
