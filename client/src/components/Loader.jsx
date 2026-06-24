export default function Loader({ label = 'Cargando…' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <div className="w-10 h-10 rounded-full border-4 border-slate-300 border-t-mtg-blue animate-spin" />
      <span>{label}</span>
    </div>
  );
}
