import { Upload } from "lucide-react";

export function CampaignCsvPanel({
  csvInput,
  matchedCount,
  onCsvInputChange,
}: {
  csvInput: string;
  matchedCount: number;
  onCsvInputChange: (value: string) => void;
}) {
  const previewRows = csvInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => {
      const [phone = "", name = ""] = line.split(",");
      return { name: name.trim() || "cliente", phone: phone.trim() };
    });

  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>
        <Upload aria-hidden="true" />
        CSV / lista
      </h3>
      <textarea
        onChange={(event) => onCsvInputChange(event.target.value)}
        placeholder={"telefone,nome\n5511999999999,Ana"}
        rows={7}
        value={csvInput}
      />
      <p>
        Telefones sao usados para localizar conversas existentes. Linhas sem
        conversa correspondente aparecem bloqueadas na revisao.
      </p>
      <strong>{matchedCount} conversa(s) encontradas</strong>
      {previewRows.length ? (
        <div className="crm-whatsapp-campaign-csv-preview">
          <span>Previa</span>
          {previewRows.map((row, index) => (
            <div key={`${row.phone}-${index}`}>
              <code>{row.phone}</code>
              <small>{row.name}</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
