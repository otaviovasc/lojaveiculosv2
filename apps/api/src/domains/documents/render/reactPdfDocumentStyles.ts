import { StyleSheet } from "@react-pdf/renderer";

export const createDocumentPdfStyles = StyleSheet.create;

export const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#151515",
    fontSize: 9.5,
    padding: "132 46 68",
  },
  body: { gap: 16 },

  /* Header — dark brand bar aligned to the page gutter */
  header: {
    alignItems: "center",
    backgroundColor: "#151515",
    borderBottomColor: "#e11f26",
    borderBottomWidth: 3,
    flexDirection: "row",
    gap: 12,
    left: 46,
    padding: 16,
    position: "absolute",
    right: 46,
    top: 34,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "#e11f26",
    borderRadius: 7,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    height: 40,
    justifyContent: "center",
    letterSpacing: 0.5,
    width: 40,
  },
  brandCopy: { flex: 1, gap: 3 },
  storeName: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  headerMuted: { color: "#b8adaa", fontSize: 7.5, letterSpacing: 0.2 },
  documentTitle: { alignItems: "flex-end", flex: 1.1, gap: 4 },
  headerTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.2,
    textAlign: "right",
  },

  /* Intro paragraph */
  intro: { color: "#1f1b1b", fontSize: 10, lineHeight: 1.55 },

  /* Field-grid sections */
  section: { gap: 10 },
  sectionCompact: { gap: 8, marginTop: 2 },
  sectionTitle: {
    borderBottomColor: "#e8e3e2",
    borderBottomWidth: 1,
    color: "#151515",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.6,
    paddingBottom: 5,
    textTransform: "uppercase",
  },
  fieldGrid: {
    columnGap: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
  },
  field: {
    borderBottomColor: "#ece7e4",
    borderBottomWidth: 1,
    gap: 2,
    paddingBottom: 6,
    paddingTop: 2,
    width: "48%",
  },
  fieldLabel: {
    color: "#8a807b",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldValue: { color: "#151515", fontSize: 10, lineHeight: 1.35 },

  /* Clauses */
  clauseOpening: { gap: 10 },
  clause: {
    borderLeftColor: "#e11f26",
    borderLeftWidth: 2,
    gap: 3,
    paddingLeft: 11,
  },
  clauseLabel: {
    color: "#b81820",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clauseText: { color: "#151515", fontSize: 9.5, lineHeight: 1.55 },

  /* Signatures */
  signatures: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "space-between",
    marginTop: 34,
  },
  signature: { gap: 5, width: "46%" },
  signatureSpace: { height: 26 },
  signatureLine: { borderTopColor: "#151515", borderTopWidth: 1 },
  signatureLabel: { color: "#151515", fontSize: 8, fontWeight: 700 },

  /* Footer */
  footer: {
    borderTopColor: "#e8e3e2",
    borderTopWidth: 1,
    bottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 46,
    paddingTop: 6,
    position: "absolute",
    right: 46,
  },
  muted: { color: "#736b67", fontSize: 7.5, letterSpacing: 0.3 },
});
