const visitQuickTags = [
  { label: "🚗 Test Drive", note: "Test drive agendado" },
  { label: "🔄 Avaliação na Troca", note: "Avaliação na troca" },
  { label: "📋 Financiamento", note: "Simulação de financiamento" },
  { label: "🤝 Proposta Comercial", note: "Apresentação de proposta" },
] as const;

export function CrmVisitQuickTags({
  onAddTag,
}: {
  onAddTag: (note: string) => void;
}) {
  return (
    <div className="crm-visit-quick-tags">
      {visitQuickTags.map((tag) => (
        <button
          className="crm-visit-tag-btn"
          key={tag.note}
          onClick={() => onAddTag(tag.note)}
          type="button"
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
