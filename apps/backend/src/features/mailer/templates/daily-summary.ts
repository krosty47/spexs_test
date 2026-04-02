import { baseLayout } from './base-layout';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface WorkflowSummaryRow {
  workflowName: string;
  open: number;
  resolved: number;
  snoozed: number;
}

export interface DailySummaryData {
  rows: WorkflowSummaryRow[];
  since: Date;
  date?: Date;
}

export function dailySummaryTemplate(data: DailySummaryData): string {
  const dateStr = (data.date ?? new Date()).toLocaleDateString('en-US', {
    dateStyle: 'long',
  });

  const sinceStr = data.since.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const totalOpen = data.rows.reduce((sum, r) => sum + r.open, 0);
  const totalResolved = data.rows.reduce((sum, r) => sum + r.resolved, 0);
  const totalSnoozed = data.rows.reduce((sum, r) => sum + r.snoozed, 0);

  const tableRows = data.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(r.workflowName)}</td>
        <td style="padding:10px 12px;font-size:14px;color:#dc2626;font-weight:600;text-align:center;border-bottom:1px solid #f3f4f6;">${r.open}</td>
        <td style="padding:10px 12px;font-size:14px;color:#16a34a;font-weight:600;text-align:center;border-bottom:1px solid #f3f4f6;">${r.resolved}</td>
        <td style="padding:10px 12px;font-size:14px;color:#d97706;font-weight:600;text-align:center;border-bottom:1px solid #f3f4f6;">${r.snoozed}</td>
      </tr>`,
    )
    .join('');

  return baseLayout(`
    <!-- Summary Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
          Daily Summary
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
      Event Summary for ${dateStr}
    </h1>

    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      Here is a summary of events from the last 24 hours (since ${sinceStr}).
    </p>

    <!-- Stats Cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:33%;padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;">
            <tr>
              <td style="padding:16px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">${totalOpen}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Open</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="width:33%;padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;">
            <tr>
              <td style="padding:16px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${totalResolved}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Resolved</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="width:33%;padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:8px;">
            <tr>
              <td style="padding:16px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;">${totalSnoozed}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Snoozed</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Detail Table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background-color:#f9fafb;">
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Workflow</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Open</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Resolved</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Snoozed</td>
      </tr>
      ${tableRows}
    </table>
  `);
}
