import { createDocumentPdfStyles } from "../../documents/render/reactPdfDocumentStyles.js";
import type {
  VehicleChecklistOverviewItem,
  VehicleChecklistOverviewStatus,
} from "../readModels/vehicleChecklistOverview.js";

export const customStyles = createDocumentPdfStyles({
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fafaf9",
    borderColor: "#e8e3e2",
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    borderRadius: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#151515",
  },
  summaryLabel: {
    fontSize: 6.5,
    color: "#78716c",
    textTransform: "uppercase",
    marginTop: 2,
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e8e3e2",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#151515",
    borderBottomWidth: 2,
    borderBottomColor: "#e11f26",
    padding: 6,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e3e2",
    padding: 6,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#fafaf9",
  },
  tableCell: {
    fontSize: 8,
    color: "#151515",
  },
  failedCount: {
    color: "#b81820",
    fontWeight: 700,
  },
  vehicleTitle: {
    fontWeight: 700,
    fontSize: 8,
    color: "#151515",
  },
  vehicleSubtitle: {
    fontSize: 6.5,
    color: "#78716c",
    marginTop: 1,
  },
  badge: {
    padding: "2 4",
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 700,
    textAlign: "center",
    alignSelf: "flex-start",
  },
  badgeSuccess: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  badgeBlue: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgeNeutral: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
});

export function getOverviewStatusBadgeStyle(
  status: VehicleChecklistOverviewStatus,
) {
  if (status === "passed")
    return [customStyles.badge, customStyles.badgeSuccess];
  if (status === "failed" || status === "missing")
    return [customStyles.badge, customStyles.badgeDanger];
  if (status === "in_progress" || status === "pending")
    return [customStyles.badge, customStyles.badgeWarning];
  return [customStyles.badge, customStyles.badgeNeutral];
}

export function getUnitStatusBadgeStyle(
  status: VehicleChecklistOverviewItem["unit"]["status"],
) {
  if (status === "available")
    return [customStyles.badge, customStyles.badgeSuccess];
  if (status === "reserved" || status === "in_preparation")
    return [customStyles.badge, customStyles.badgeWarning];
  if (status === "sold" || status === "acquired")
    return [customStyles.badge, customStyles.badgeBlue];
  if (status === "delivered")
    return [customStyles.badge, customStyles.badgeNeutral];
  if (status === "inactive")
    return [customStyles.badge, customStyles.badgeDanger];
  return [customStyles.badge, customStyles.badgeNeutral];
}

export function overviewStatusLabel(status: VehicleChecklistOverviewStatus) {
  return {
    failed: "Com reprovação",
    in_progress: "Em andamento",
    missing: "Sem checklist",
    passed: "Concluído",
    pending: "Pendente",
    waived: "Dispensado",
  }[status];
}
