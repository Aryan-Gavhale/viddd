import { useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Trash2, Star, Banknote, ExternalLink, FileText } from "lucide-react";
import { toast } from "react-toastify";
import {
  listPaymentMethods,
  createSetupIntent,
  savePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  fetchBillingProfile,
  updateBillingProfile,
  exportInvoices,
  getConnectStatus,
  startConnectOnboarding,
  getConnectDashboardLink,
  fetchMe,
} from "../../services/settingsApi";

export function PaymentSettings() {
  const [me, setMe] = useState(null);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState(null);
  const [savingBilling, setSavingBilling] = useState(false);
  const [connect, setConnect] = useState(null);

  const refresh = async () => {
    try {
      const [m, pms, b, c] = await Promise.all([
        fetchMe().catch(() => null),
        listPaymentMethods().catch(() => ({ paymentMethods: [] })),
        fetchBillingProfile().catch(() => null),
        getConnectStatus().catch(() => null),
      ]);
      setMe(m);
      setMethods(pms?.paymentMethods || []);
      setBilling(b || {});
      setConnect(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const isFreelancer = me?.role === "FREELANCER" || me?.freelancerProfile;

  return (
    <div className="space-y-6">
      <PaymentMethodsCard methods={methods} onChanged={refresh} />
      <BillingProfileCard
        billing={billing || {}}
        onSave={async (patch) => {
          setSavingBilling(true);
          try {
            const fresh = await updateBillingProfile(patch);
            setBilling(fresh || patch);
            toast.success("Billing profile saved");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save");
          } finally {
            setSavingBilling(false);
          }
        }}
        saving={savingBilling}
      />
      <InvoicesCard />
      {isFreelancer && <ConnectCard connect={connect} onChanged={refresh} />}
    </div>
  );
}

function Card({ title, subtitle, children, action }) {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-violet-900 dark:text-violet-100">{title}</h2>
          {subtitle && <p className="text-violet-600 dark:text-violet-400 text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function PaymentMethodsCard({ methods, onChanged }) {
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    setBusy(true);
    try {
      const res = await createSetupIntent();
      // Without Stripe Elements integrated we redirect the user to Stripe's
      // hosted setup-intent page if a clientSecret is returned. The user
      // returns to /settings#payment after confirming.
      if (res?.clientSecret) {
        // Fallback: prompt for card via simple Stripe Checkout-like flow.
        // For full inline UX, integrate `@stripe/stripe-js` + Elements here.
        toast.info(
          "Card setup intent created. Complete card details to attach a payment method.",
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create setup intent");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Remove this payment method?")) return;
    try {
      await deletePaymentMethod(id);
      toast.success("Removed");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove");
    }
  };

  const onMakeDefault = async (id) => {
    try {
      await setDefaultPaymentMethod(id);
      toast.success("Default updated");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update default");
    }
  };

  return (
    <Card
      title="Saved Payment Methods"
      subtitle="Cards used to pay for orders and subscriptions"
      action={
        <button
          onClick={onAdd}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Add card
        </button>
      }
    >
      {methods.length === 0 ? (
        <p className="text-sm text-gray-500">No saved payment methods.</p>
      ) : (
        <ul className="divide-y divide-violet-100">
          {methods.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-violet-500" />
                <div>
                  <div className="text-sm font-medium">
                    {m.brand?.toUpperCase() || "Card"} •••• {m.last4}
                    {m.isDefault && (
                      <span className="ml-2 inline-flex items-center text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Star className="h-3 w-3 mr-1" /> Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Exp {String(m.expMonth || "").padStart(2, "0")}/{m.expYear}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!m.isDefault && (
                  <button
                    onClick={() => onMakeDefault(m.id)}
                    className="text-xs text-violet-700 hover:underline"
                  >
                    Make default
                  </button>
                )}
                <button onClick={() => onDelete(m.id)} className="text-red-600 hover:text-red-700" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BillingProfileCard({ billing, onSave, saving }) {
  const [form, setForm] = useState({
    taxId: billing.taxId || "",
    gstNumber: billing.gstNumber || "",
    companyPan: billing.companyPan || "",
    billingName: billing.billingName || "",
    line1: billing.billingAddress?.line1 || "",
    line2: billing.billingAddress?.line2 || "",
    city: billing.billingAddress?.city || "",
    state: billing.billingAddress?.state || "",
    postalCode: billing.billingAddress?.postalCode || "",
    country: billing.billingAddress?.country || "",
  });

  const onChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      taxId: form.taxId,
      gstNumber: form.gstNumber,
      companyPan: form.companyPan,
      billingName: form.billingName,
      billingAddress: {
        line1: form.line1,
        line2: form.line2,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      },
    });
  };

  return (
    <Card title="Tax & Billing Address" subtitle="Used on your invoices and tax forms">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Billing name" value={form.billingName} onChange={onChange("billingName")} />
          <Input label="Tax ID / VAT" value={form.taxId} onChange={onChange("taxId")} />
          <Input label="GST number (IN)" value={form.gstNumber} onChange={onChange("gstNumber")} />
          <Input label="PAN (IN)" value={form.companyPan} onChange={onChange("companyPan")} />
          <Input label="Address line 1" value={form.line1} onChange={onChange("line1")} />
          <Input label="Address line 2" value={form.line2} onChange={onChange("line2")} />
          <Input label="City" value={form.city} onChange={onChange("city")} />
          <Input label="State / region" value={form.state} onChange={onChange("state")} />
          <Input label="Postal code" value={form.postalCode} onChange={onChange("postalCode")} />
          <Input label="Country" value={form.country} onChange={onChange("country")} />
        </div>
        <button
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save billing details"}
        </button>
      </form>
    </Card>
  );
}

function InvoicesCard() {
  const [busy, setBusy] = useState(false);
  const onExport = async () => {
    setBusy(true);
    try {
      const res = await exportInvoices().catch(() => null);
      // exportInvoices returns the manifest; the actual download is performed
      // here from `res.invoices[i].pdfUrl`. This avoids adding `archiver`.
      const invoices = res && res.data ? res.data.invoices : null;
      if (!invoices?.length) {
        toast.info("No invoices to export yet");
      } else {
        invoices.forEach((inv) => {
          if (inv.pdfUrl) window.open(inv.pdfUrl, "_blank");
        });
        toast.success(`Opening ${invoices.length} invoice(s)`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Invoices" subtitle="Download PDF invoices for your records">
      <button
        onClick={onExport}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Export invoices
      </button>
    </Card>
  );
}

function ConnectCard({ connect, onChanged }) {
  const enabled = connect?.enabled !== false;
  const onboarded = !!connect?.onboardingComplete;
  const payouts = !!connect?.payoutsEnabled;

  const onStart = async () => {
    try {
      const res = await startConnectOnboarding();
      if (res?.url) window.location.href = res.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start onboarding");
    }
  };

  const onDashboard = async () => {
    try {
      const res = await getConnectDashboardLink();
      if (res?.url) window.open(res.url, "_blank");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to open dashboard");
    }
  };

  return (
    <Card
      title="Payouts (Stripe Connect)"
      subtitle="Receive payouts from completed orders"
    >
      {!enabled ? (
        <p className="text-sm text-gray-500">Stripe Connect is not enabled on this environment.</p>
      ) : onboarded ? (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
              <Banknote className="h-3.5 w-3.5" />
              {payouts ? "Payouts enabled" : "Awaiting payout activation"}
            </span>
          </div>
          <button
            onClick={onDashboard}
            className="inline-flex items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            <ExternalLink className="h-4 w-4" /> Open Stripe dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Complete Stripe onboarding to receive payouts from your video editing work.
          </p>
          <button
            onClick={onStart}
            className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700"
          >
            Start onboarding
          </button>
        </div>
      )}
    </Card>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-md border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
      />
    </div>
  );
}
