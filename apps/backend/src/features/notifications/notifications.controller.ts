import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';

/**
 * SSE controller for real-time notifications.
 * Clients connect via GET /notifications/sse to receive a stream of events.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    // TODO: Extract authenticated userId from request and subscribe to user-specific events
    return this.notificationsService.subscribe();
  }
}
