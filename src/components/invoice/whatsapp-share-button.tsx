"use client";

export function WhatsAppShareButton({
  invoiceId,
  propertyName,
  clientName,
  total,
  remaining,
  currency,
}: {
  invoiceId: string;
  propertyName: string;
  clientName: string;
  total: number;
  remaining: number;
  currency: string;
}) {
  function handleClick() {
    const url = `${window.location.origin}/invoice/${invoiceId}`;
    const message = [
      `Facture — ${propertyName}`,
      `Client : ${clientName}`,
      `Total : ${total.toLocaleString("fr-FR")} ${currency}`,
      `Reste à payer : ${remaining.toLocaleString("fr-FR")} ${currency}`,
      "",
      url,
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs font-medium text-foreground"
    >
      Partager sur WhatsApp
    </button>
  );
}
