'use client';

import { useParams } from 'next/navigation';
import { EventDetail } from '@/features/events';

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  return <EventDetail eventId={params.id} />;
}
