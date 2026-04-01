import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

/**
 * Notifications service using SSE for real-time alert delivery.
 * Other services call notify() to push events to connected clients.
 */
@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<MessageEvent>();

  /**
   * Subscribe to the SSE event stream.
   */
  subscribe(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  /**
   * Emit a notification event to all connected SSE clients.
   * @param userId - Target user ID (will be used for filtering once auth is wired)
   * @param event - Event type identifier
   * @param payload - Notification payload
   */
  async notify(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    this.events$.next({ type: event, data: { userId, ...payload } });
  }
}
