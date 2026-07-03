import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type {
  StorefrontMediaApi,
  StorefrontMediaUploadPayload,
} from "./storefrontMediaApi";

type StorefrontMediaLibraryValue = {
  assets: readonly StorefrontMediaAsset[];
  isLoading: boolean;
  statusMessage: string | null;
  refresh: () => Promise<void>;
  uploadImage: (
    input: StorefrontMediaUploadPayload,
  ) => Promise<StorefrontMediaAsset>;
};

const StorefrontMediaLibraryContext =
  createContext<StorefrontMediaLibraryValue | null>(null);

export function StorefrontMediaLibraryProvider({
  api,
  children,
}: {
  api: StorefrontMediaApi;
  children: ReactNode;
}) {
  const [assets, setAssets] = useState<readonly StorefrontMediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setAssets(await api.listAssets());
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(
        formatApiErrorDisplay(error, "Não foi possível carregar a galeria."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadImage = useCallback(
    async (input: StorefrontMediaUploadPayload) => {
      const asset = await api.uploadImage(input);
      setAssets((current) => [asset, ...current]);
      return asset;
    },
    [api],
  );

  const value = useMemo(
    () => ({ assets, isLoading, refresh, statusMessage, uploadImage }),
    [assets, isLoading, refresh, statusMessage, uploadImage],
  );

  return (
    <StorefrontMediaLibraryContext.Provider value={value}>
      {children}
    </StorefrontMediaLibraryContext.Provider>
  );
}

export function useStorefrontMediaLibrary() {
  const context = useContext(StorefrontMediaLibraryContext);
  if (!context) {
    throw new Error("Storefront media library provider is missing.");
  }
  return context;
}
