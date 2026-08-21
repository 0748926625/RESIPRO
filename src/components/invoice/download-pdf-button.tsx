export function DownloadPdfButton({ invoiceId }: { invoiceId: string }) {
  return (
    <a
      href={`/invoice/${invoiceId}/pdf`}
      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
    >
      Télécharger le PDF
    </a>
  );
}
