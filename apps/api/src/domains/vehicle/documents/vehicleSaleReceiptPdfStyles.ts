import { createDocumentPdfStyles } from "../../documents/render/reactPdfDocumentStyles.js";

/** V1 ReciboVenda dense-form layout styles. */
export const receiptStyles = createDocumentPdfStyles({
  titleHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  mainTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  header: {
    alignItems: "center",
    flexDirection: "column",
    marginBottom: 20,
  },
  headerTop: { alignItems: "center", marginBottom: 10, width: "100%" },
  headerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  storeInfo: { flex: 1, paddingTop: 10 },
  storeName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  storeDetail: { color: "#000000", fontSize: 8, marginBottom: 1 },
  headerRightDetails: { paddingTop: 10, width: 180 },
  headerDetailRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  headerDetailLabel: { fontSize: 8, fontWeight: "bold", marginRight: 5 },
  headerDetailValue: { fontSize: 8, textAlign: "right", width: 80 },
  section: { marginBottom: 10 },
  obsBox: { fontSize: 8, lineHeight: 1.4, marginTop: 10 },
  transferBox: {
    borderTopColor: "#000000",
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 5,
  },
  dateLocation: { fontSize: 9, fontWeight: "bold", marginTop: 20 },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    paddingTop: 10,
  },
  signatureItem: { alignItems: "center", width: "30%" },
  signatureLine: {
    borderTopColor: "#000000",
    borderTopWidth: 0.5,
    marginBottom: 4,
    width: "100%",
  },
  signatureLabel: { fontSize: 8, fontWeight: "bold", textAlign: "center" },
});
