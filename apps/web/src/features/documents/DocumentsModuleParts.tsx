export function DocumentsTableSkeleton() {
  return (
    <div
      className="documents-table-skeleton"
      aria-label="Carregando documentos"
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
