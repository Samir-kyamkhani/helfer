import Link from "next/link";
import { getBillingHistory } from "@/lib/payments/service";
import { getCurrentBillingOwner } from "@/app/settings/billing/_owner";

export const instant = false;

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
}

export default async function InvoicesPage() {
  const owner = await getCurrentBillingOwner();
  const { invoices, payments } = await getBillingHistory({ ownerType: owner.ownerType, ownerId: owner.ownerId });
  return (
    <div className="space-y-8">
      <Link href="/settings/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing overview</Link>
      <header><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Billing history</p><h2 className="mt-2 text-2xl font-semibold">Invoices and payments</h2><p className="mt-2 text-sm text-muted-foreground">Provider invoices and payment events for {owner.name}.</p></header>
      <section className="overflow-x-auto rounded-2xl border bg-card">
        <div className="border-b p-5"><h3 className="font-semibold">Invoices</h3></div>
        {invoices.length ? <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="p-4">Date</th><th className="p-4">Invoice</th><th className="p-4">Status</th><th className="p-4">Amount</th><th className="p-4">Document</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t"><td className="p-4">{invoice.createdAt.toLocaleDateString()}</td><td className="p-4 font-mono text-xs">{invoice.providerInvoiceId}</td><td className="p-4 capitalize">{invoice.status.replaceAll("_", " ")}</td><td className="p-4">{money(invoice.amountPaid || invoice.amountDue, invoice.currency)}</td><td className="p-4">{invoice.invoicePdfUrl ? <a className="text-primary hover:underline" href={invoice.invoicePdfUrl} target="_blank" rel="noreferrer">Download PDF</a> : invoice.hostedInvoiceUrl ? <a className="text-primary hover:underline" href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">Open invoice</a> : "—"}</td></tr>)}</tbody></table> : <p className="p-5 text-sm text-muted-foreground">Invoices will appear after the provider sends a verified billing event.</p>}
      </section>
      <section className="overflow-x-auto rounded-2xl border bg-card">
        <div className="border-b p-5"><h3 className="font-semibold">Payments</h3></div>
        {payments.length ? <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="p-4">Date</th><th className="p-4">Reference</th><th className="p-4">Description</th><th className="p-4">Status</th><th className="p-4">Amount</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t"><td className="p-4">{(payment.paidAt ?? payment.createdAt).toLocaleDateString()}</td><td className="p-4 font-mono text-xs">{payment.providerPaymentId}</td><td className="p-4">{payment.description ?? "Subscription payment"}</td><td className="p-4 capitalize">{payment.status.toLowerCase().replaceAll("_", " ")}</td><td className="p-4">{money(payment.amount, payment.currency)}</td></tr>)}</tbody></table> : <p className="p-5 text-sm text-muted-foreground">Payments will appear after the provider confirms them.</p>}
      </section>
    </div>
  );
}
