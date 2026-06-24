import { memo } from 'react';
import CardItem from './CardItem.jsx';

function CardGrid({ cards = [] }) {
  if (!cards.length) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg mb-2">No se encontraron cartas con esos filtros.</p>
        <p className="text-sm">Prueba ajustando la búsqueda o limpiando los filtros.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}

export default memo(CardGrid);
