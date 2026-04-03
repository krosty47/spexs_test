'use client';

import type { ReactNode } from 'react';
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationBar } from '@/components/pagination-bar.component';
import { CONTENT_PADDING_X } from '@/lib/utils';

interface PaginatedTableProps {
  columns: string[];
  desktopRows: ReactNode;
  mobileCards: ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginatedTable({
  columns,
  desktopRows,
  mobileCards,
  page,
  totalPages,
  onPageChange,
}: PaginatedTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        {/* Desktop table */}
        <div className={`hidden md:block ${CONTENT_PADDING_X}`}>
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{desktopRows}</TableBody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className={`grid gap-3 md:hidden ${CONTENT_PADDING_X}`}>{mobileCards}</div>
      </div>

      <div className="shrink-0 border-t bg-background">
        <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
