export function DocumentsTableSkeleton() {
  return (
    <div
      aria-label="Carregando documentos"
      className="documents-table-skeleton"
      role="status"
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
