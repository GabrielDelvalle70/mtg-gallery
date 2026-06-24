const MANA_ORBS = [
  { color: 'bg-mtg-white', shadow: 'shadow-[0_0_18px_rgba(248,246,227,0.7)]' },
  { color: 'bg-mtg-blue', shadow: 'shadow-[0_0_18px_rgba(14,104,171,0.8)]' },
  { color: 'bg-mtg-black', shadow: 'shadow-[0_0_18px_rgba(21,11,0,0.9)]' },
  { color: 'bg-mtg-red', shadow: 'shadow-[0_0_18px_rgba(211,32,42,0.8)]' },
  { color: 'bg-mtg-green', shadow: 'shadow-[0_0_18px_rgba(0,115,62,0.8)]' },
];

export default function LoginTransition({ username }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-slate-950/95 backdrop-blur-sm text-slate-100"
    >
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full border border-mtg-mythic/40 animate-pulse-ring" />
        <div className="absolute inset-4 rounded-full border border-mtg-mythic/30 animate-pulse-ring [animation-delay:0.6s]" />

        <div className="absolute inset-0 animate-orbit-slow">
          {MANA_ORBS.map((orb, i) => {
            const angle = (i / MANA_ORBS.length) * 2 * Math.PI;
            const radius = 80;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <span
                key={i}
                className={`absolute top-1/2 left-1/2 w-6 h-6 rounded-full ${orb.color} ${orb.shadow}`}
                style={{ transform: `translate(${x - 12}px, ${y - 12}px)` }}
              />
            );
          })}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-block w-5 h-5 rounded-full bg-mtg-mythic shadow-glow animate-pulse" />
        </div>
      </div>

      <div className="text-center animate-rise-in">
        <p className="text-xs uppercase tracking-[0.3em] text-mtg-mythic/80 mb-2">Conexión establecida</p>
        <h2 className="font-display text-3xl">
          Bienvenido{username ? `, ${username}` : ''}
        </h2>
        <p className="mt-2 text-sm text-slate-400">Preparando tu colección…</p>
      </div>
    </div>
  );
}
