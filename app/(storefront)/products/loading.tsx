export default function ProductsLoading() {
  const placeholders = Array.from({ length: 12 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <div className="h-7 w-48 animate-pulse bg-(--sf-surface)" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {placeholders.map((_, i) => (
          <div key={i} className="flex flex-col gap-5 py-2">
            <div
              className="w-full animate-pulse bg-(--sf-surface)"
              style={{ aspectRatio: "var(--sf-media-ratio)", borderRadius: "var(--sf-radius-media)" }}
            />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-3/4 animate-pulse bg-(--sf-surface)" />
              <div className="h-3 w-1/2 animate-pulse bg-(--sf-surface)" />
              <div className="h-3 w-1/3 animate-pulse bg-(--sf-surface)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
