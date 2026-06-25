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
import { InventoryField, InventoryInput } from "./InventoryFormParts";

export function InventoryCatalogSelector({
  api,
  catalog,
  onCatalogChange,
  onYearChange,
  manufactureYear,
  onManufactureYearChange,
}: {
  api: InventoryApi | null;
  catalog: InventoryCatalogSnapshot | null;
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void;
  onYearChange?: (year: number | null) => void;
  manufactureYear?: string | undefined;
  onManufactureYearChange?: ((value: string) => void) | undefined;
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <CatalogSelect
          label="Tipo"
          required
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
          required
          kind="brand"
          combobox
          disabled={!api || brands.length === 0}
          displayValue={
            !brandCode ? (catalog?.brandName ?? undefined) : undefined
          }
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
          required
          combobox
          disabled={!brandCode}
          displayValue={
            !modelFamilyCode ? (catalog?.modelName ?? undefined) : undefined
          }
          value={modelFamilyCode}
          className="sm:col-span-2 xl:col-span-2"
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
          label="Ano Modelo"
          required
          combobox
          disabled={!modelFamilyCode}
          displayValue={!yearCode ? catalogYearDisplay(catalog) : undefined}
          value={yearCode}
          className="sm:col-span-1 xl:col-span-1"
          placeholder={!modelFamilyCode ? "Modelo antes" : "Ex. 2026"}
          onChange={(value) => {
            setYearCode(value);
            setVersionCode("");
            onCatalogChange(null);

            const versionCodesForYear = yearToVersionsMap[value] || [];
            const filtered = allVersions.filter((v) =>
              versionCodesForYear.includes(v.code),
            );
            setFilteredVersions(filtered);

            const selectedYearOpt = years.find((y) => y.code === value);
            if (selectedYearOpt?.modelYear && onYearChange) {
              onYearChange(selectedYearOpt.modelYear);
            }
          }}
          options={years}
        />
        {manufactureYear !== undefined && onManufactureYearChange ? (
          <InventoryField
            className="sm:col-span-1 xl:col-span-1"
            label="Ano Fab."
            required
          >
            <InventoryInput
              className="w-full"
              min={0}
              onChange={(event) => onManufactureYearChange(event.target.value)}
              placeholder="Ex: 2021"
              type="number"
              value={manufactureYear}
            />
          </InventoryField>
        ) : null}
        <CatalogSelect
          label="Versão FIPE"
          required
          combobox
          disabled={!yearCode}
          displayValue={
            !versionCode ? (catalog?.modelName ?? undefined) : undefined
          }
          value={versionCode}
          className="sm:col-span-2 xl:col-span-7"
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

function catalogYearDisplay(catalog: InventoryCatalogSnapshot | null) {
  if (!catalog) return undefined;
  return (
    catalog.yearName ??
    (catalog.modelYear ? String(catalog.modelYear) : undefined)
  );
}
