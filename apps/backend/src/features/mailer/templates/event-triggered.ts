import { baseLayout, escapeHtml } from './base-layout';

export interface EventTriggeredData {
  eventTitle: string;
  workflowName: string;
  triggeredAt?: Date;
  payload?: Record<string, unknown>;
}

export function eventTriggeredTemplate(data: EventTriggeredData): string {
  const time = (data.triggeredAt ?? new Date()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let payloadRows = '';
  if (data.payload && Object.keys(data.payload).length > 0) {
    const rows = Object.entries(data.payload)
      .map(
        ([key, val]) =>
          `<tr>
            <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${escapeHtml(key)}</td>
            <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;font-weight:500;">${escapeHtml(String(val))}</td>
          </tr>`,
      )
      .join('');

    payloadRows = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr style="background-color:#f9fafb;">
          <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Metric</td>
          <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Value</td>
        </tr>
        ${rows}
      </table>`;
  }

  return baseLayout(`
    <!-- Alert Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
          Alert Triggered
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
      ${escapeHtml(data.eventTitle)}
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Workflow <strong style="color:#111827;">"${escapeHtml(data.workflowName)}"</strong> triggered a new event.
    </p>

    <!-- Info Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;padding:16px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Triggered At</p>
          <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${time}</p>
        </td>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
          <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Open</p>
        </td>
      </tr>
    </table>

    ${payloadRows}
  `);
}
