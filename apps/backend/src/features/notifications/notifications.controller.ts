import { Controller, Sse, Req, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';

/**
 * SSE controller for real-time notifications.
 * Clients connect via GET /notifications/sse to receive a stream of events.
 * Requires authentication via httpOnly JWT cookie.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse')
  @UseGuards(JwtCookieGuard)
  sse(@Req() req: { user: { id: string } }): Observable<MessageEvent> {
    return this.notificationsService.subscribe(req.user.id);
  }
}
