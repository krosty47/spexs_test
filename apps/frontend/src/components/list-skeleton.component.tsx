import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CONTENT_PADDING_X } from '@/lib/utils';

const DESKTOP_ROWS = Array.from({ length: 8 });
const MOBILE_CARDS = Array.from({ length: 6 });

interface ListSkeletonProps {
  mobileCardFooter?: (index: number) => ReactNode;
}

export function ListSkeleton({ mobileCardFooter }: ListSkeletonProps = {}) {
  return (
    <>
      {/* Desktop rows */}
      <div className={`hidden space-y-2 md:block ${CONTENT_PADDING_X}`}>
        {DESKTOP_ROWS.map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      {/* Mobile cards */}
      <div className={`grid gap-3 md:hidden ${CONTENT_PADDING_X}`}>
        {MOBILE_CARDS.map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              {mobileCardFooter ? (
                mobileCardFooter(i)
              ) : (
                <div className="mt-2 flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
