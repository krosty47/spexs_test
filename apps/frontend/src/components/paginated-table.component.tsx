'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationBar } from '@/components/pagination-bar.component';

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{desktopRows}</TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 md:hidden">{mobileCards}</div>
      </div>

      <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
