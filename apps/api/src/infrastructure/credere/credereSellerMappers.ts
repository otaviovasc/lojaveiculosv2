import type { FinancingSeller } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  readArray,
  readBoolean,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export function mapSellers(
  payload: Record<string, unknown>,
): FinancingSeller[] {
  return readSellerArray(payload)
    .map(readRecord)
    .map((seller) => ({
      active: readBoolean(seller.active) === true,
      cpf: readString(seller.cpf)?.replace(/\D/g, "") ?? "",
      id: readString(seller.id) ?? "",
      name: readString(seller.name) ?? "",
      status: readString(seller.status),
    }))
    .filter(
      (seller) =>
        seller.id &&
        seller.name &&
        seller.cpf &&
        (seller.status === "active" || seller.active === true),
    )
    .map(({ cpf, id, name }) => ({ active: true, cpf, id, name }));
}

function readSellerArray(payload: Record<string, unknown>) {
  const users = readArray(payload.users);
  if (users.length) return users;
  const data = readArray(payload.data);
  if (data.length) return data;
  const dataUsers = readArray(readRecord(payload.data).users);
  if (dataUsers.length) return dataUsers;
  const user = readRecord(payload.user);
  return Object.keys(user).length ? [user] : [];
}
