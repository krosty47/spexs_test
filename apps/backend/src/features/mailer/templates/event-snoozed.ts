import { baseLayout, escapeHtml } from './base-layout';

export interface EventSnoozedData {
  eventTitle: string;
  workflowName: string;
  snoozedUntil: Date;
  reason?: string;
}

export function eventSnoozedTemplate(data: EventSnoozedData): string {
  const until = data.snoozedUntil.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return baseLayout(`
    <!-- Snoozed Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#fffbeb;color:#d97706;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
          Event Snoozed
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
      ${escapeHtml(data.eventTitle)}
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      An event from workflow <strong style="color:#111827;">"${escapeHtml(data.workflowName)}"</strong> has been snoozed.
    </p>

    <!-- Info Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Snoozed Until</p>
          <p style="margin:0;font-size:14px;color:#d97706;font-weight:600;">${until}</p>
        </td>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
          <p style="margin:0;font-size:14px;color:#d97706;font-weight:600;">Snoozed</p>
        </td>
      </tr>
      ${
        data.reason
          ? `<tr>
              <td colspan="2" style="padding:0 16px 12px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
                <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(data.reason)}</p>
              </td>
            </tr>`
          : ''
      }
    </table>
  `);
}
