import { useMemo } from 'react';

const PAGE_SIZE = 175;

export function usePagination({ total, page, pageSize = PAGE_SIZE } = {}) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
    return {
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }, [total, page, pageSize]);
}
