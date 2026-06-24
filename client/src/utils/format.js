export function formatPrice(price, currency = 'USD') {
  if (price == null || price === '') return '—';
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'short', day: '2-digit' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export function truncate(text, n = 220) {
  if (!text) return '';
  return text.length <= n ? text : `${text.slice(0, n - 1).trimEnd()}…`;
}

export function pluralize(n, singular, plural) {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}
