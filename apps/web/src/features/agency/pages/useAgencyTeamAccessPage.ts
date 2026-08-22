import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type {
  IdentityInvitationView,
  InviteStoreMemberInput,
  RoleKey,
  RoleManagementView,
  UpdateMembershipAccessInput,
} from "../../settings/types";
import type {
  AgencyTeamAccessApi,
  AgencyTeamAccessDirectory,
} from "../teamAccessApiClient";
import { useAgencyTenantSelection } from "../useAgencyTenantSelection";
import { createRuntimeAgencyTeamAccessApi } from "./AgencyTeamAccessPage.runtime";

export type UseAgencyTeamAccessPageOptions = {
  api?: AgencyTeamAccessApi | undefined;
};

export type SaveMemberAccessInput = {
  overrides: { allowed: boolean; permission: string; reason: string }[];
  role: RoleKey;
};

export function useAgencyTeamAccessPage(
  options: UseAgencyTeamAccessPageOptions = {},
) {
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState<AgencyTeamAccessDirectory | null>(
    null,
  );
  const [roles, setRoles] = useState<RoleManagementView | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    searchParams.get("storeId"),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const activeTenantId = agencyTenant?.tenantId;

  const resolveApi = useCallback(async () => {
    return options.api ?? (await createRuntimeAgencyTeamAccessApi());
  }, [options.api]);

  const loadData = useCallback(
    async (targetStoreId?: string | null, isBackground = false) => {
      const generation = ++requestGeneration.current;
      if (!activeTenantId) {
        setLoading(false);
        setRefreshing(false);
        setDirectory(null);
        setRoles(null);
        setSelectedStoreId(null);
        return;
      }

      if (isBackground) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const api = await resolveApi();
        const nextDirectory = await api.getDirectory(activeTenantId);
        if (generation !== requestGeneration.current) return;

        const storeExists = (id: string | null | undefined): id is string =>
          Boolean(id && nextDirectory.stores.some((s) => s.storeId === id));

        const paramStoreId = searchParams.get("storeId");
        const resolvedStoreId = storeExists(targetStoreId)
          ? targetStoreId
          : storeExists(selectedStoreId)
            ? selectedStoreId
            : storeExists(paramStoreId)
              ? paramStoreId
              : (nextDirectory.stores[0]?.storeId ?? null);

        setDirectory(nextDirectory);
        setSelectedStoreId(resolvedStoreId);

        if (resolvedStoreId) {
          const nextRoles = await api.getStoreAccess(
            activeTenantId,
            resolvedStoreId,
          );
          if (generation !== requestGeneration.current) return;
          setRoles(nextRoles);
        } else {
          setRoles(null);
        }
      } catch (err) {
        if (generation !== requestGeneration.current) return;
        setError(
          formatApiErrorDisplay(
            err,
            "Não foi possível carregar os acessos da equipe.",
          ),
        );
      } finally {
        if (generation === requestGeneration.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeTenantId, resolveApi, searchParams, selectedStoreId],
  );

  const selectStore = useCallback(
    async (storeId: string) => {
      if (storeId === selectedStoreId || !activeTenantId) return;
      setSelectedStoreId(storeId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("storeId", storeId);
      setSearchParams(nextParams, { replace: true });

      const generation = ++requestGeneration.current;
      setRefreshing(true);
      setError(null);

      try {
        const api = await resolveApi();
        const nextRoles = await api.getStoreAccess(activeTenantId, storeId);
        if (generation !== requestGeneration.current) return;
        setRoles(nextRoles);
      } catch (err) {
        if (generation !== requestGeneration.current) return;
        setError(
          formatApiErrorDisplay(
            err,
            "Não foi possível carregar os acessos da loja.",
          ),
        );
      } finally {
        if (generation === requestGeneration.current) {
          setRefreshing(false);
        }
      }
    },
    [
      activeTenantId,
      resolveApi,
      searchParams,
      selectedStoreId,
      setSearchParams,
    ],
  );

  const handleSaveMemberAccess = useCallback(
    async (membershipId: string, input: SaveMemberAccessInput) => {
      if (!activeTenantId || !selectedStoreId) return;
      const generation = requestGeneration.current;
      setIsSaving(true);
      setError(null);
      try {
        const api = await resolveApi();
        const updateInput: UpdateMembershipAccessInput = {
          overrides: input.overrides,
          role: input.role,
        };
        const updated = await api.updateMembershipAccess(
          activeTenantId,
          selectedStoreId,
          membershipId,
          updateInput,
        );
        if (generation === requestGeneration.current) setRoles(updated);
      } catch (err) {
        if (generation === requestGeneration.current) {
          setError(
            formatApiErrorDisplay(
              err,
              "Não foi possível salvar as alterações de acesso.",
            ),
          );
        }
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [activeTenantId, resolveApi, selectedStoreId],
  );

  const handleInviteMember = useCallback(
    async (input: InviteStoreMemberInput): Promise<IdentityInvitationView> => {
      if (!activeTenantId || !selectedStoreId) {
        throw new Error("Selecione uma loja antes de enviar o convite.");
      }
      const generation = requestGeneration.current;
      const api = await resolveApi();
      const invitation = await api.inviteStoreMember(
        activeTenantId,
        selectedStoreId,
        input,
      );
      const updated = await api.getStoreAccess(activeTenantId, selectedStoreId);
      if (generation === requestGeneration.current) setRoles(updated);
      return invitation;
    },
    [activeTenantId, resolveApi, selectedStoreId],
  );

  const handleResendInvitation = useCallback(
    async (invitationId: string): Promise<IdentityInvitationView> => {
      if (!activeTenantId || !selectedStoreId) {
        throw new Error("Selecione uma loja antes de reenviar o convite.");
      }
      const generation = requestGeneration.current;
      const api = await resolveApi();
      const invitation = await api.resendInvitation(
        activeTenantId,
        selectedStoreId,
        invitationId,
      );
      const updated = await api.getStoreAccess(activeTenantId, selectedStoreId);
      if (generation === requestGeneration.current) setRoles(updated);
      return invitation;
    },
    [activeTenantId, resolveApi, selectedStoreId],
  );

  const refresh = useCallback(() => {
    return loadData(selectedStoreId, true);
  }, [loadData, selectedStoreId]);

  useEffect(() => {
    void loadData(searchParams.get("storeId"), false);
  }, [activeTenantId]);

  useEffect(() => {
    if (!selectedStoreId) return;
    if (searchParams.get("storeId") === selectedStoreId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("storeId", selectedStoreId);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedStoreId, setSearchParams]);

  const selectedStore = useMemo(
    () =>
      directory?.stores.find((store) => store.storeId === selectedStoreId) ??
      null,
    [directory?.stores, selectedStoreId],
  );

  return {
    agencyTenant,
    agencyTenants,
    directory,
    error,
    handleInviteMember,
    handleResendInvitation,
    handleSaveMemberAccess,
    isSaving,
    loading,
    refresh,
    refreshing,
    roles,
    selectAgencyTenant,
    selectedStore,
    selectedStoreId,
    selectStore,
  };
}
