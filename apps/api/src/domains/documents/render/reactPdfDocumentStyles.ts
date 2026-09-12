import { StyleSheet } from "@react-pdf/renderer";

export const createDocumentPdfStyles = StyleSheet.create;

export const documentPdfColors = {
  navy: "#14213d",
  ink: "#333333",
  muted: "#666666",
  cardBackground: "#f8fafc",
  cardBorder: "#e2e8f0",
  tableHeaderBackground: "#f1f5f9",
  labelMuted: "#64748b",
  valueInk: "#1e293b",
  highlight: "#ffff00",
  footerBorder: "#cbd5e1",
  footerMuted: "#94a3b8",
} as const;

/**
 * Shared visual language ported from the V1 (@react-pdf/renderer) documents:
 * Helvetica on white, navy accents, slate card grids and dense form rows.
 */
export const styles = StyleSheet.create({
  /* Page variants */
  pageContract: {
    backgroundColor: "#ffffff",
    color: documentPdfColors.ink,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.6,
    paddingBottom: 80,
    paddingHorizontal: 50,
    paddingTop: 45,
  },
  pageForm: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.2,
    padding: 30,
  },
  pageTerm: {
    backgroundColor: "#ffffff",
    color: documentPdfColors.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
    padding: 60,
  },
  pageReservation: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.35,
    paddingBottom: 40,
    paddingHorizontal: 38,
    paddingTop: 34,
  },

  /* Premium header (contract) */
  header: {
    alignItems: "center",
    borderBottomColor: documentPdfColors.navy,
    borderBottomWidth: 1.5,
    flexDirection: "column",
    marginBottom: 20,
    paddingBottom: 15,
  },
  headerTop: { alignItems: "center", marginBottom: 15, width: "100%" },
  headerBottom: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  logo: { maxHeight: 80, maxWidth: 200, objectFit: "contain" },
  logoContainer: { alignItems: "center", marginBottom: 5 },
  storeName: {
    color: documentPdfColors.navy,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  storeDetail: {
    color: documentPdfColors.muted,
    fontSize: 8,
    marginBottom: 2,
  },
  docTitle: {
    color: documentPdfColors.navy,
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "right",
    textTransform: "uppercase",
  },
  docSubtitle: {
    color: documentPdfColors.muted,
    fontSize: 8.5,
    textAlign: "right",
    textTransform: "uppercase",
  },

  /* Section titles */
  sectionTitle: {
    borderBottomColor: documentPdfColors.navy,
    borderBottomWidth: 1,
    color: "#000000",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 15,
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  formSectionHeader: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 5,
  },

  /* Vehicle card grid */
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  vehicleField: {
    backgroundColor: documentPdfColors.cardBackground,
    borderColor: documentPdfColors.cardBorder,
    borderRadius: 4,
    borderWidth: 1,
    padding: 8,
  },
  vehicleFieldHalf: { width: "48.5%" },
  vehicleFieldThird: { width: "31.5%" },
  vehicleFieldFull: { width: "100%" },
  cardFieldLabel: {
    color: documentPdfColors.labelMuted,
    fontSize: 7,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  cardFieldValue: {
    color: documentPdfColors.valueInk,
    fontSize: 9.5,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  /* Prose */
  preambleText: {
    color: documentPdfColors.ink,
    fontSize: 9.5,
    marginBottom: 12,
    textAlign: "justify",
  },
  clauseTitle: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase",
  },
  clauseText: {
    color: documentPdfColors.ink,
    fontSize: 9.5,
    marginBottom: 10,
    textAlign: "justify",
  },
  bold: { fontWeight: "bold" },
  highlight: {
    backgroundColor: documentPdfColors.highlight,
    paddingHorizontal: 2,
  },

  /* Signatures */
  signaturesRow: {
    flexDirection: "row",
    gap: 40,
    justifyContent: "space-between",
  },
  signatureBox: { alignItems: "center", flex: 1 },
  signatureLine: {
    borderTopColor: "#000000",
    borderTopWidth: 1,
    marginBottom: 6,
    paddingTop: 45,
    width: "100%",
  },
  signatureName: {
    fontSize: 9.5,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  signatureRole: {
    color: documentPdfColors.muted,
    fontSize: 7.5,
    letterSpacing: 0.3,
    textAlign: "center",
    textTransform: "uppercase",
  },

  /* Fixed footer + rubrica */
  footer: {
    borderTopColor: documentPdfColors.footerBorder,
    borderTopWidth: 0.5,
    bottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 50,
    paddingTop: 10,
    position: "absolute",
    right: 50,
  },
  footerContactText: { color: documentPdfColors.labelMuted, fontSize: 8 },
  footerPageNumber: { color: documentPdfColors.footerMuted, fontSize: 8 },
  rubricaFixed: {
    alignItems: "center",
    bottom: 50,
    left: 80,
    position: "absolute",
    right: 80,
  },
  rubricaLine: {
    borderTopColor: "#000000",
    borderTopWidth: 0.5,
    marginBottom: 2,
    width: "100%",
  },
  rubricaText: {
    color: documentPdfColors.muted,
    fontSize: 7,
    textTransform: "uppercase",
  },
});
