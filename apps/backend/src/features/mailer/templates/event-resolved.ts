import { baseLayout, escapeHtml } from './base-layout';

export interface EventResolvedData {
  eventTitle: string;
  workflowName: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export function eventResolvedTemplate(data: EventResolvedData): string {
  const time = (data.resolvedAt ?? new Date()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return baseLayout(`
    <!-- Resolved Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#f0fdf4;color:#16a34a;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
          Event Resolved
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
      ${escapeHtml(data.eventTitle)}
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      An event from workflow <strong style="color:#111827;">"${escapeHtml(data.workflowName)}"</strong> has been resolved.
    </p>

    <!-- Info Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Resolved At</p>
          <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${time}</p>
        </td>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
          <p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;">Resolved</p>
        </td>
      </tr>
      ${
        data.resolvedBy
          ? `<tr>
              <td colspan="2" style="padding:0 16px 12px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Resolved By</p>
                <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${escapeHtml(data.resolvedBy)}</p>
              </td>
            </tr>`
          : ''
      }
    </table>
  `);
}
