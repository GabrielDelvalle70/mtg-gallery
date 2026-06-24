export default function GridSkeleton({ count = 18 }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[5/7] skeleton" />
      ))}
    </div>
  );
}
