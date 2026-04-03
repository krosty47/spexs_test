'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { StatusBadge } from '@/components/status-badge.component';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SnoozeDialog } from './snooze-dialog.component';

const SKELETON_2 = Array.from({ length: 2 });

function EventDetailSkeleton() {
  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1 h-8 w-8 rounded-md" />
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-56 sm:h-7" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Actions card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-28 rounded-md" />
        </CardContent>
      </Card>

      {/* Payload card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Comments card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {SKELETON_2.map((_, i) => (
            <div key={i} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-16 flex-1 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md sm:w-16" />
          </div>
        </CardContent>
      </Card>

      {/* History card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent className="space-y-2">
          {SKELETON_2.map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const [comment, setComment] = useState('');
  const router = useRouter();
  const utils = trpc.useUtils();

  const eventQuery = trpc.events.findOne.useQuery({ id: eventId });

  const resolveMutation = trpc.events.resolve.useMutation({
    onSuccess: () => {
      utils.events.findOne.invalidate({ id: eventId });
      utils.events.findAll.invalidate();
    },
  });

  const snoozeMutation = trpc.events.snooze.useMutation({
    onSuccess: () => {
      utils.events.findOne.invalidate({ id: eventId });
      utils.events.findAll.invalidate();
    },
  });

  const addCommentMutation = trpc.events.addComment.useMutation({
    onSuccess: () => {
      utils.events.findOne.invalidate({ id: eventId });
      setComment('');
    },
  });

  if (eventQuery.isLoading) {
    return <EventDetailSkeleton />;
  }

  if (eventQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {eventQuery.error.message}</p>;
  }

  const event = eventQuery.data;
  if (!event) return null;

  const handleSnooze = (until: Date, reason?: string) => {
    snoozeMutation.mutate({ id: eventId, until, reason });
  };

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-8 w-8 shrink-0"
            onClick={() => router.push('/events')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold sm:text-2xl">{event.title}</h2>
              <StatusBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Workflow: {event.workflow.name}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {event.status === 'OPEN' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => resolveMutation.mutate({ id: eventId })}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve Event'}
              </Button>
            </CardContent>
          </Card>

          <SnoozeDialog
            onSnooze={handleSnooze}
            isPending={snoozeMutation.isPending}
            isSuccess={snoozeMutation.isSuccess}
          />
        </div>
      )}

      {/* Payload */}
      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-[var(--muted)] p-4 text-sm">
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
          {event.comments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No comments yet. Be the first to add one.
            </p>
          ) : (
            event.comments.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm">{c.content}</p>
              </div>
            ))
          )}

          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1"
            />
            <Button
              className="w-full sm:w-auto"
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
              {event.history.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="font-medium">{h.user.name}</span> {h.action.toLowerCase()} this
                    event
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] sm:text-sm">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
