import assert from "node:assert/strict";
import test from "node:test";
import {
  buyerSnapshot,
  listingSnapshot,
  saleSourceSnapshot,
} from "./sale-snapshots.mjs";

test("creates V2-shaped buyer and vehicle snapshots", () => {
  const sale = {
    buyerCpf: "123",
    buyerName: "Cliente",
    buyerPhone1: "48999999999",
    id: 1,
    saleKm: 55000,
    vehicleSnapshot: {
      ano_fabricacao: 2020,
      ano_modelo: 2021,
      chassi: "CHASSI",
      placa_final: "abc1d23",
      renavam: "12345678901",
      titulo_anuncio: "Veículo teste",
    },
  };
  const buyer = buyerSnapshot(sale, null);
  const listing = listingSnapshot(
    sale,
    { id: 2 },
    { url_foto: "https://example.com/photo.jpg" },
  );

  assert.equal(buyer.name, "Cliente");
  assert.equal(buyer.phone, "48999999999");
  assert.equal(buyer.document, "123");
  assert.equal(listing.title, "Veículo teste");
  assert.equal(listing.plate, "ABC1D23");
  assert.equal(listing.manufactureYear, 2020);
  assert.equal(listing.renavam, "12345678901");
  assert.ok(buyer.legacyV1);
  assert.ok(listing.legacyV1);
});

test("maps V1 contracted services into the V2 source snapshot", () => {
  const snapshot = saleSourceSnapshot(
    {
      id: 1,
      sellerCommission: "500.00",
      seguroPctAplicado: "10",
      seguroPremio: "1000.00",
      transferComAlienacao: true,
      transferStatus: "completed",
      transferValue: "750.00",
    },
    { id: 2, name: "Indicação" },
    [
      {
        id: 3,
        metadata: { bank: "Banco", financingValue: 50000, installments: 24 },
        method: "financiamento",
        value: 50000,
      },
      {
        id: 4,
        metadata: { tradeInVehicle: { brand: "Marca", plate: "abc1234" } },
        method: "troca",
        value: 30000,
      },
    ],
  );

  assert.equal(snapshot.financing.status, "approved");
  assert.equal(snapshot.financing.bankName, "Banco");
  assert.equal(snapshot.documentation.status, "charged");
  assert.equal(snapshot.insurance.status, "issued");
  assert.equal(snapshot.commission.enabled, true);
  assert.equal(snapshot.tradeIn.enabled, true);
  assert.equal(snapshot.tradeIn.plate, "ABC1234");
});
