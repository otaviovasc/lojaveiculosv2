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
  onYearChange,
}: {
  api: InventoryApi | null;
  catalog: InventoryCatalogSnapshot | null;
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void;
  onYearChange?: (year: number | null) => void;
}) {
  const [vehicleType, setVehicleType] = useState<InventoryCatalogVehicleType>(
    catalog?.vehicleType ?? "cars",
  );
  const [brandCode, setBrandCode] = useState(catalog?.brandCode ?? "");
  const [modelFamilyCode, setModelFamilyCode] = useState("");
  const [yearCode, setYearCode] = useState(catalog?.yearCode ?? "");
  const [versionCode, setVersionCode] = useState(catalog?.modelCode ?? "");

  const [brands, setBrands] = useState<readonly InventoryCatalogOption[]>([]);
  const [models, setModels] = useState<readonly InventoryCatalogOption[]>([]);
  const [years, setYears] = useState<readonly InventoryCatalogYearOption[]>([]);
  const [allVersions, setAllVersions] = useState<
    readonly InventoryCatalogVersionOption[]
  >([]);
  const [filteredVersions, setFilteredVersions] = useState<
    readonly InventoryCatalogVersionOption[]
  >([]);
  const [yearToVersionsMap, setYearToVersionsMap] = useState<
    Record<string, string[]>
  >({});
  const [state, setState] = useState<CatalogState>({ kind: "idle" });

  const onCatalogChangeRef = useRef(onCatalogChange);
  useEffect(() => {
    onCatalogChangeRef.current = onCatalogChange;
  }, [onCatalogChange]);

  // Load brands
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

  // Load models for selected brand
  useEffect(() => {
    if (!api || !brandCode) {
      setModels([]);
      setAllVersions([]);
      setYears([]);
      setFilteredVersions([]);
      setYearToVersionsMap({});
      return;
    }
    setState({ kind: "loading" });
    void api
      .listCatalogModels(brandCode, vehicleType)
      .then((items) => {
        setModels(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, vehicleType]);

  // Load versions and then load their years in parallel
  useEffect(() => {
    if (!api || !brandCode || !modelFamilyCode) {
      setAllVersions([]);
      setYears([]);
      setFilteredVersions([]);
      setYearToVersionsMap({});
      return;
    }

    setState({ kind: "loading" });
    void api
      .listCatalogVersions(brandCode, modelFamilyCode, vehicleType)
      .then(async (versionsList) => {
        setAllVersions(versionsList);

        // Fetch years for all versions in parallel
        try {
          const yearsResults = await Promise.all(
            versionsList.map((v) =>
              api
                .listCatalogYears(brandCode, v.code, vehicleType)
                .then((yearsList) => ({ versionCode: v.code, yearsList }))
                .catch(() => ({ versionCode: v.code, yearsList: [] })),
            ),
          );

          const uniqueYears: InventoryCatalogYearOption[] = [];
          const mapping: Record<string, string[]> = {};

          for (const res of yearsResults) {
            for (const y of res.yearsList) {
              let codes = mapping[y.code];
              if (!codes) {
                codes = [];
                mapping[y.code] = codes;
                uniqueYears.push(y);
              }
              codes.push(res.versionCode);
            }
          }

          // Sort years descending
          uniqueYears.sort((a, b) => {
            const yearA = a.modelYear ?? 0;
            const yearB = b.modelYear ?? 0;
            return yearB - yearA;
          });

          setYears(uniqueYears);
          setYearToVersionsMap(mapping);
          setState({ kind: "idle" });
        } catch (err) {
          setState(toErrorState(err));
        }
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, modelFamilyCode, vehicleType]);

  // Load years if we have a versionCode but no modelFamilyCode (e.g. initial draft load)
  useEffect(() => {
    if (!api || !brandCode || !versionCode || modelFamilyCode) return;
    setState({ kind: "loading" });
    void api
      .listCatalogYears(brandCode, versionCode, vehicleType)
      .then((items) => {
        setYears(items);
        setState({ kind: "idle" });
      })
      .catch((error) => setState(toErrorState(error)));
  }, [api, brandCode, versionCode, vehicleType, modelFamilyCode]);

  // Load version option placeholder if we have a versionCode but no modelFamilyCode (e.g. initial draft load)
  useEffect(() => {
    if (!api || !brandCode || !versionCode || modelFamilyCode) return;
    if (catalog) {
      setFilteredVersions([
        {
          code: catalog.modelCode ?? versionCode,
          name: catalog.modelName ?? "",
          modelFamilyCode: "",
          modelFamilyName: "",
        },
      ]);
    }
  }, [api, brandCode, versionCode, vehicleType, modelFamilyCode, catalog]);

  // Sync snapshot when both versionCode and yearCode are present
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <CatalogSelect
          label="Tipo"
          value={vehicleType}
          className="sm:col-span-1 xl:col-span-1"
          onChange={(value) => {
            setVehicleType(value as InventoryCatalogVehicleType);
            resetCatalog(
              setBrandCode,
              (v) => setModelFamilyCode(v),
              setVersionCode,
              setYearCode,
              onCatalogChange,
            );
            setAllVersions([]);
            setYears([]);
            setFilteredVersions([]);
            setYearToVersionsMap({});
          }}
          options={[
            { code: "cars", name: "Carro" },
            { code: "motorcycles", name: "Moto" },
            { code: "trucks", name: "Caminhão" },
          ]}
        />
        <CatalogSelect
          label="Marca FIPE"
          kind="brand"
          combobox
          disabled={!api || brands.length === 0}
          value={brandCode}
          className="sm:col-span-1 xl:col-span-2"
          placeholder={!api ? "Carregando..." : "Digite para buscar..."}
          onChange={(value) => {
            setBrandCode(value);
            setModelFamilyCode("");
            setYearCode("");
            setVersionCode("");
            setModels([]);
            setAllVersions([]);
            setYears([]);
            setFilteredVersions([]);
            setYearToVersionsMap({});
            onCatalogChange(null);
          }}
          options={brands}
        />
        <CatalogSelect
          label="Modelo"
          combobox
          disabled={!brandCode}
          value={modelFamilyCode}
          className="sm:col-span-1 xl:col-span-2"
          placeholder={
            !brandCode ? "Selecione a marca primeiro" : "Digite para buscar..."
          }
          onChange={(value) => {
            setModelFamilyCode(value);
            setYearCode("");
            setVersionCode("");
            setYears([]);
            setAllVersions([]);
            setFilteredVersions([]);
            setYearToVersionsMap({});
            onCatalogChange(null);
          }}
          options={models}
        />
        <CatalogSelect
          label="Ano FIPE"
          combobox
          disabled={!modelFamilyCode}
          value={yearCode}
          className="sm:col-span-1 xl:col-span-1"
          placeholder={!modelFamilyCode ? "Modelo antes" : "Ex. 2026"}
          onChange={(value) => {
            setYearCode(value);
            setVersionCode("");
            onCatalogChange(null);

            // Filter compatible versions
            const versionCodesForYear = yearToVersionsMap[value] || [];
            const filtered = allVersions.filter((v) =>
              versionCodesForYear.includes(v.code),
            );
            setFilteredVersions(filtered);

            // Autofill year fields in form if possible
            const selectedYearOpt = years.find((y) => y.code === value);
            if (selectedYearOpt?.modelYear && onYearChange) {
              onYearChange(selectedYearOpt.modelYear);
            }
          }}
          options={years}
        />
        <CatalogSelect
          label="Versão FIPE"
          combobox
          disabled={!yearCode}
          value={versionCode}
          className="sm:col-span-2 xl:col-span-6"
          placeholder={
            !yearCode ? "Selecione o ano primeiro" : "Digite para buscar..."
          }
          onChange={(value) => {
            setVersionCode(value);
            onCatalogChange(null);
          }}
          options={filteredVersions}
        />
      </div>
      <CatalogStatus catalog={catalog} state={state} />
    </div>
  );
}
