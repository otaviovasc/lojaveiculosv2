export type BillingTab = "billing" | "history" | "overview";

export function BillingTabs({
  activeTab,
  onChange,
}: {
  activeTab: BillingTab;
  onChange: (tab: BillingTab) => void;
}) {
  const tabs: { label: string; value: BillingTab }[] = [
    { label: "Plano e pacotes", value: "overview" },
    { label: "Cobrança", value: "billing" },
    { label: "Histórico", value: "history" },
  ];

  return (
    <div className="billing-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          aria-selected={activeTab === tab.value}
          className={activeTab === tab.value ? "is-active" : ""}
          key={tab.value}
          onClick={() => onChange(tab.value)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
