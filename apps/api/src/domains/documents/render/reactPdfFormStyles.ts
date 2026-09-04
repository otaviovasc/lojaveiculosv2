import {
  createDocumentPdfStyles,
  documentPdfColors,
} from "./reactPdfDocumentStyles.js";

/** Payment tables and underlined form-field rows (receipts, contract). */
export const formStyles = createDocumentPdfStyles({
  /* Premium payments table */
  paymentTable: {
    borderColor: documentPdfColors.cardBorder,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 15,
    marginTop: 5,
    overflow: "hidden",
  },
  paymentHeader: {
    backgroundColor: documentPdfColors.tableHeaderBackground,
    borderBottomColor: documentPdfColors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentHeaderText: {
    color: "#475569",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  paymentRow: {
    backgroundColor: "#ffffff",
    borderBottomColor: documentPdfColors.tableHeaderBackground,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paymentColMethod: { width: "30%" },
  paymentColDesc: { width: "40%" },
  paymentColDate: { width: "15%" },
  paymentColValue: { textAlign: "right", width: "15%" },
  paymentText: { color: "#334155", fontSize: 8.5 },
  paymentValueText: { color: "#000000", fontSize: 9.5, fontWeight: "bold" },
  paymentTotalRow: {
    backgroundColor: documentPdfColors.cardBackground,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  paymentTotalLabel: {
    color: documentPdfColors.valueInk,
    fontSize: 10,
    fontWeight: "bold",
    marginRight: 10,
    textTransform: "uppercase",
  },
  paymentTotalValue: { color: "#000000", fontSize: 10, fontWeight: "bold" },

  /* Dense form table (receipts) */
  formTable: { borderColor: "#000000", borderWidth: 0.5, marginTop: 5 },
  formTableHeader: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#000000",
    borderBottomWidth: 0.5,
    flexDirection: "row",
  },
  formTableRow: {
    borderBottomColor: "#000000",
    borderBottomWidth: 0.5,
    flexDirection: "row",
  },
  formTableCol: {
    borderRightColor: "#000000",
    borderRightWidth: 0.5,
    fontSize: 7.5,
    padding: 3,
  },
  formTableColLast: { fontSize: 7.5, padding: 3 },
  formTableTotalRow: {
    borderTopColor: "#000000",
    borderTopWidth: 0.5,
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 3,
  },
  formTableTotalLabel: { fontSize: 8, fontWeight: "bold", marginRight: 10 },
  formTableTotalValue: { fontSize: 8, fontWeight: "bold" },

  /* Underlined label:value form fields */
  fieldRow: { flexDirection: "row", gap: 10, marginBottom: 3 },
  field: {
    borderBottomColor: "#000000",
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingBottom: 1,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginRight: 4,
    textTransform: "uppercase",
  },
  fieldValue: { flex: 1, fontSize: 8 },
});
