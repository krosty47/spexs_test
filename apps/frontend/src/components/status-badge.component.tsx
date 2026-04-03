const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800 border-red-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  SNOOZED: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label ?? status}
    </span>
  );
}
