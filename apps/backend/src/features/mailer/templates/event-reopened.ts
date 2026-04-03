import { baseLayout, escapeHtml } from './base-layout';

export interface EventReopenedData {
  eventTitle: string;
  workflowName: string;
}

export function eventReopenedTemplate(data: EventReopenedData): string {
  return baseLayout(`
    <!-- Reopened Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#fef3c7;color:#b45309;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
          Event Reopened
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
      ${escapeHtml(data.eventTitle)}
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Snooze expired &mdash; event from workflow <strong style="color:#111827;">"${escapeHtml(data.workflowName)}"</strong> is open again and needs attention.
    </p>

    <!-- Info Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
          <p style="margin:0;font-size:14px;color:#b45309;font-weight:600;">Reopened</p>
        </td>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
          <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Snooze expired</p>
        </td>
      </tr>
    </table>
  `);
}
