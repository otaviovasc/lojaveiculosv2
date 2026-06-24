import { useEffect, useRef, useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import {
  CatalogSelect,
  CatalogStatus,
  resetCatalog,
  toErrorState,
  type CatalogState,
} from "./InventoryCatalogSelectorParts";
import type {
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
  InventoryCatalogVehicleType,
  InventoryCatalogVersionOption,
  InventoryCatalogYearOption,
} from "../model/types";

export function InventoryCatalogSelector({
  api,
  catalog,
  onCatalogChange,
}: {
  api: InventoryApi | null;
  catalog: InventoryCatalogSnapshot | null;
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void;
}) {
  const [vehicleType, setVehicleType] = useState<InventoryCatalogVehicleType>(
    catalog?.vehicleType ?? "cars",
  );
  const [brandCode, setBrandCode] = useState(catalog?.brandCode ?? "");
  const [modelFamilyCode, setModelFamilyCode] = useState("");
  const [versionCode, setVersionCode] = useState(catalog?.modelCode ?? "");
  const [yearCode, setYearCode] = useState(catalog?.yearCode ?? "");
  const [brands, setBrands] = useState<readonly InventoryCatalogOption[]>([]);
  const [models, setModels] = useState<readonly InventoryCatalogOption[]>([]);
  const [versions, setVersions] = useState<
    readonly InventoryCatalogVersionOption[]
  >([]);
  const [years, setYears] = useState<readonly InventoryCatalogYearOption[]>([]);
  const [state, setState] = useState<CatalogState>({ kind: "idle" });
  const onCatalogChangeRef = useRef(onCatalogChange);

  useEffect(() => {
    onCatalogChangeRef.current = onCatalogChange;
  }, [onCatalogChange]);

  useEffect(() => {
    if (!api) return;
    setState({ kind: "loading" });
    void api
      .listCatalogBrands(vehicleType)
      .then((items) => {
        setBrands(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, vehicleType]);

  useEffect(() => {
    if (!api || !brandCode) return;
    setState({ kind: "loading" });
    void api
      .listCatalogModels(brandCode, vehicleType)
      .then((items) => {
        setModels(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, vehicleType]);

  useEffect(() => {
    if (!api || !brandCode || !modelFamilyCode) return;
    setState({ kind: "loading" });
    void api
      .listCatalogVersions(brandCode, modelFamilyCode, vehicleType)
      .then((items) => {
        setVersions(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, modelFamilyCode, vehicleType]);

  useEffect(() => {
    if (!api || !brandCode || !versionCode) return;
    setState({ kind: "loading" });
    void api
      .listCatalogYears(brandCode, versionCode, vehicleType)
      .then((items) => {
        setYears(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, versionCode, vehicleType]);

  useEffect(() => {
    if (!api || !brandCode || !versionCode || !yearCode) return;
    setState({ kind: "loading" });
    void api
      .getCatalogSnapshot({
        brandCode,
        modelCode: versionCode,
        vehicleType,
        yearCode,
      })
      .then((snapshot) => {
        onCatalogChangeRef.current(snapshot);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, versionCode, vehicleType, yearCode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CatalogSelect
          label="Tipo"
          value={vehicleType}
          onChange={(value) => {
            setVehicleType(value as InventoryCatalogVehicleType);
            resetCatalog(
              setBrandCode,
              setModelFamilyCode,
              setVersionCode,
              setYearCode,
              onCatalogChange,
            );
          }}
          options={[
            { code: "cars", name: "Carro" },
            { code: "motorcycles", name: "Moto" },
            { code: "trucks", name: "Caminhao" },
          ]}
        />
        <CatalogSelect
          label="Marca FIPE"
          kind="brand"
          combobox
          disabled={!api || brands.length === 0}
          value={brandCode}
          onChange={(value) => {
            setBrandCode(value);
            setModelFamilyCode("");
            setVersionCode("");
            setYearCode("");
            setModels([]);
            setVersions([]);
            setYears([]);
            onCatalogChange(null);
          }}
          options={brands}
        />
        <CatalogSelect
          label="Modelo"
          combobox
          disabled={!brandCode}
          value={modelFamilyCode}
          onChange={(value) => {
            setModelFamilyCode(value);
            setVersionCode("");
            setYearCode("");
            setVersions([]);
            setYears([]);
            onCatalogChange(null);
          }}
          options={models}
        />
        <CatalogSelect
          label="Versao FIPE"
          combobox
          disabled={!modelFamilyCode}
          value={versionCode}
          onChange={(value) => {
            setVersionCode(value);
            setYearCode("");
            setYears([]);
            onCatalogChange(null);
          }}
          options={versions}
        />
        <CatalogSelect
          label="Ano FIPE"
          combobox
          disabled={!versionCode}
          value={yearCode}
          onChange={setYearCode}
          options={years}
        />
      </div>
      <CatalogStatus catalog={catalog} state={state} />
    </div>
  );
}
