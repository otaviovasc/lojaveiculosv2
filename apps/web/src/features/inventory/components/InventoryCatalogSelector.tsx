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
    <div className="grid gap-4 lg:grid-cols-5">
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
        value={brandCode}
        onChange={(value) => {
          setBrandCode(value);
          setModelFamilyCode("");
          setVersionCode("");
          setYearCode("");
          onCatalogChange(null);
        }}
        options={brands}
      />
      <CatalogSelect
        label="Modelo"
        value={modelFamilyCode}
        onChange={(value) => {
          setModelFamilyCode(value);
          setVersionCode("");
          setYearCode("");
          onCatalogChange(null);
        }}
        options={models}
      />
      <CatalogSelect
        label="Versao FIPE"
        value={versionCode}
        onChange={(value) => {
          setVersionCode(value);
          setYearCode("");
          onCatalogChange(null);
        }}
        options={versions}
      />
      <CatalogSelect
        label="Ano FIPE"
        value={yearCode}
        onChange={setYearCode}
        options={years}
      />
      <CatalogStatus catalog={catalog} state={state} />
    </div>
  );
}
