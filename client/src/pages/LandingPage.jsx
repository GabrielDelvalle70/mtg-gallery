import { Link } from 'react-router-dom';

const MANA_ORBS = [
  { color: 'bg-mtg-white', label: 'W', shadow: 'shadow-[0_0_24px_rgba(248,246,227,0.6)]' },
  { color: 'bg-mtg-blue', label: 'U', shadow: 'shadow-[0_0_24px_rgba(14,104,171,0.7)]' },
  { color: 'bg-mtg-black', label: 'B', shadow: 'shadow-[0_0_24px_rgba(21,11,0,0.9)]' },
  { color: 'bg-mtg-red', label: 'R', shadow: 'shadow-[0_0_24px_rgba(211,32,42,0.7)]' },
  { color: 'bg-mtg-green', label: 'G', shadow: 'shadow-[0_0_24px_rgba(0,115,62,0.7)]' },
];

const FEATURES = [
  {
    title: 'Más de 90.000 cartas',
    body: 'Catálogo completo de Scryfall: cada set, cada rareza, cada idioma.',
  },
  {
    title: 'Búsqueda avanzada',
    body: 'Filtrá por color, rareza, tipo, año, formato legal o coste de maná.',
  },
  {
    title: 'Tu colección personal',
    body: 'Próximamente: armá mazos, marcá favoritos y seguí los precios.',
  },
];

export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-6 py-16 sm:px-12 sm:py-20 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20 dark:opacity-30">
          <div className="flex gap-6">
            {MANA_ORBS.map((orb) => (
              <span
                key={orb.label}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${orb.color} ${orb.shadow}`}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.4em] text-mtg-mythic mb-4">
            Magic: The Gathering
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight mb-4">
            Tu colección virtual,
            <br />
            <span className="text-mtg-blue">en un solo lugar</span>
          </h1>
          <p className="max-w-xl mx-auto text-slate-600 dark:text-slate-400 mb-8">
            Explorá el catálogo completo de cartas de Magic. Buscá, filtrá y descubrí cada
            rareza, set e ilustración con datos en tiempo real de Scryfall.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn btn-primary px-6 py-3 text-base">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="btn px-6 py-3 text-base">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <h3 className="font-display text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{f.body}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-center text-xs text-slate-500">
        Datos provistos por Scryfall · Magic: The Gathering © Wizards of the Coast
      </p>
    </div>
  );
}
