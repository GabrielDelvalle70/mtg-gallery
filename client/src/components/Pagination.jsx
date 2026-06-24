import { memo } from 'react';

function Pagination({ page, totalPages, hasPrev, hasNext, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Paginación">
      <button className="btn" disabled={!hasPrev} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="text-sm text-slate-500">
        Página <strong className="text-slate-900 dark:text-slate-100">{page}</strong> de {totalPages}
      </span>
      <button className="btn" disabled={!hasNext} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}

export default memo(Pagination);
