import assert from "node:assert/strict";
import test from "node:test";
import {
  mapLegacyVehicleMarkers,
  mapLegacyVehiclePublication,
} from "./target-inventory-crm.mjs";

test("publishes only V1 available and reserved vehicles", () => {
  assert.deepEqual(mapLegacyVehiclePublication("DISPONIVEL"), {
    isVisible: true,
    listingStatus: "published",
    unitStatus: "available",
  });
  assert.deepEqual(mapLegacyVehiclePublication("RESERVADO"), {
    isVisible: true,
    listingStatus: "published",
    unitStatus: "reserved",
  });
});

test("keeps draft, inactive, sold, and unknown V1 vehicles non-public", () => {
  assert.deepEqual(mapLegacyVehiclePublication("RASCUNHO"), {
    isVisible: false,
    listingStatus: "draft",
    unitStatus: "acquired",
  });
  assert.deepEqual(mapLegacyVehiclePublication("INATIVO"), {
    isVisible: false,
    listingStatus: "unpublished",
    unitStatus: "inactive",
  });
  assert.deepEqual(mapLegacyVehiclePublication("VENDIDO"), {
    isVisible: false,
    listingStatus: "sold_out",
    unitStatus: "sold",
  });
  assert.equal(mapLegacyVehiclePublication("OUTRO").isVisible, false);
  assert.notEqual(
    mapLegacyVehiclePublication("OUTRO").listingStatus,
    "published",
  );
});

test("preserves V1 destaque as a public commercial tag and ordering marker", () => {
  assert.deepEqual(
    mapLegacyVehicleMarkers({
      blindado: true,
      destaque: true,
      hide_price: true,
      is_cover: false,
      laudo: "SIM",
      leilao: true,
      under_preparation: true,
    }),
    {
      commercialTags: [
        "Destaque",
        "Blindado",
        "Leilão",
        "Laudo cautelar",
        "Em preparação",
      ],
      hidePrice: true,
      legacyFeatured: true,
    },
  );
  assert.deepEqual(
    mapLegacyVehicleMarkers({
      destaque: false,
      hide_price: false,
      is_cover: true,
      laudo: "NAO",
      leilao: false,
      under_preparation: false,
    }),
    {
      commercialTags: [],
      hidePrice: false,
      legacyFeatured: true,
    },
  );
});

test("does not turn absent or negative V1 detail flags into public tags", () => {
  const markers = mapLegacyVehicleMarkers({
    blindado: false,
    destaque: false,
    hide_price: false,
    is_cover: false,
    laudo: "NAO",
    leilao: false,
    under_preparation: false,
  });

  assert.deepEqual(markers.commercialTags, []);
});
