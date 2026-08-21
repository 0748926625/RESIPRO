import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { computeInvoiceTotals } from "@/lib/services/external-booking.service";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  headerLeft: { flexDirection: "row", gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 4, objectFit: "contain" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  muted: { color: "#666666", fontSize: 10 },
  clientBlock: { marginBottom: 20 },
  clientLabel: { fontSize: 9, color: "#888888", marginBottom: 2 },
  clientName: { fontSize: 13, fontWeight: 700 },
  table: { marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  rowLabel: { color: "#666666" },
  rowValue: { textAlign: "right" },
  bold: { fontWeight: 700 },
  remainingDue: { color: "#dc2626", fontWeight: 700, fontSize: 12 },
  remainingClear: { color: "#059669", fontWeight: 700, fontSize: 12 },
  note: { fontSize: 9, color: "#888888", marginTop: 8 },
  signatureBlock: { alignItems: "flex-end", marginTop: 24 },
  signatureImg: { width: 120, height: 48, objectFit: "contain" },
});

export function InvoicePdfDocument({
  propertyName,
  propertyCity,
  propertyAddress,
  logoUrl,
  signatureUrl,
  ownerLabel,
  ownerPhone,
  clientName,
  startsAt,
  endsAt,
  nightlyRate,
  amountPaid,
  currency,
  note,
  createdAt,
}: {
  propertyName: string;
  propertyCity: string;
  propertyAddress: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  ownerLabel: string | null;
  ownerPhone: string | null;
  clientName: string;
  startsAt: string;
  endsAt: string;
  nightlyRate: number;
  amountPaid: number;
  currency: string;
  note: string | null;
  createdAt: string;
}) {
  const totals = computeInvoiceTotals({ startsAt, endsAt, nightlyRate, amountPaid });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img; no alt prop exists */}
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.title}>Facture — {propertyName}</Text>
              <Text style={styles.muted}>
                {propertyCity}
                {propertyAddress ? `, ${propertyAddress}` : ""}
              </Text>
              {ownerLabel ? (
                <Text style={styles.muted}>
                  {ownerLabel}
                  {ownerPhone ? ` · ${ownerPhone}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.muted}>Émise le {dateFormatter.format(new Date(createdAt))}</Text>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Période</Text>
            <Text style={styles.rowValue}>
              {dateFormatter.format(new Date(startsAt))} → {dateFormatter.format(new Date(endsAt))}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nombre de nuits</Text>
            <Text style={styles.rowValue}>{totals.nights}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prix négocié / nuit</Text>
            <Text style={styles.rowValue}>
              {nightlyRate.toLocaleString("fr-FR")} {currency}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bold}>Total à payer</Text>
            <Text style={[styles.rowValue, styles.bold]}>
              {totals.total.toLocaleString("fr-FR")} {currency}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Montant avancé</Text>
            <Text style={styles.rowValue}>
              {amountPaid.toLocaleString("fr-FR")} {currency}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bold}>Reste à payer</Text>
            <Text style={totals.remaining > 0 ? styles.remainingDue : styles.remainingClear}>
              {totals.remaining.toLocaleString("fr-FR")} {currency}
            </Text>
          </View>
        </View>

        {note ? <Text style={styles.note}>{note}</Text> : null}

        {signatureUrl ? (
          <View style={styles.signatureBlock}>
            <Text style={styles.note}>Signature</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img; no alt prop exists */}
            <Image src={signatureUrl} style={styles.signatureImg} />
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
