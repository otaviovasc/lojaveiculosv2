import { Store } from "lucide-react";
import { FeatureEmptyState } from "../../../components/ui/FeatureStates";
import type { AgencyStatsStoreRow } from "../apiClient";
import { money, number, percent } from "./AgencyStatsPage.model";

export function AgencyStatsStoresTable({
  stores,
}: {
  stores: readonly AgencyStatsStoreRow[];
}) {
  if (!stores.length) {
    return (
      <FeatureEmptyState
        body="Cadastre uma loja para começar a consolidar os indicadores da rede."
        icon={Store}
        title="Nenhuma loja neste recorte"
      />
    );
  }

  return (
    <section
      aria-labelledby="agency-stats-stores-title"
      className="agency-stats-table-card"
    >
      <div className="agency-stats-table-card__header">
        <div>
          <span>Comparativo operacional</span>
          <h2 id="agency-stats-stores-title">Desempenho por loja</h2>
        </div>
        <small>
          {stores.length} {stores.length === 1 ? "loja" : "lojas"}
        </small>
      </div>
      <div
        aria-label="Tabela de desempenho por loja"
        className="agency-stats-table-scroll"
        role="region"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Loja</th>
              <th scope="col">Faturamento</th>
              <th scope="col">Vendas</th>
              <th scope="col">Leads</th>
              <th scope="col">Conversão</th>
              <th scope="col">Disponíveis</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.storeId}>
                <th scope="row">
                  <strong>{store.storeName}</strong>
                  <small>{store.storeSlug}</small>
                </th>
                <td>
                  {money(store.sales.revenueCents)}
                  <small>{money(store.sales.grossMarginCents)} margem</small>
                </td>
                <td>
                  {number(store.sales.closedCount)}
                  <small>{money(store.sales.averageTicketCents)} ticket</small>
                </td>
                <td>
                  {number(store.leads.totalCount)}
                  <small>{number(store.leads.activeCount)} ativos</small>
                </td>
                <td>
                  {percent(store.leads.conversionRate)}
                  <small>{number(store.leads.wonCount)} ganhos</small>
                </td>
                <td>
                  {number(store.inventory.availableListings)}
                  <small>
                    {number(store.inventory.totalListings)} no estoque
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
