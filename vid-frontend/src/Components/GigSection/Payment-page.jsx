import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import axiosInstance from "../../utils/axios";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { gigId, pkgName } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = location.state?.orderId || searchParams.get("orderId");

  const [gig, setGig] = useState(location.state?.gig || null);
  const [pkg, setPkg] = useState(location.state?.pkg || null);
  const [order, setOrder] = useState(location.state?.order || null);
  const [orderNumber, setOrderNumber] = useState(location.state?.orderNumber || "");
  const [totalPrice, setTotalPrice] = useState(location.state?.totalPrice || null);
  const [pricing, setPricing] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(Boolean(orderId && (!gig || !pkg)));
  const [checkoutError, setCheckoutError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(null);

  // Surfaces the local-only fake checkout banner the moment the page knows it
  // will never hit Stripe. Reads two signals:
  //   1. VITE_ALLOW_LOCAL_FAKE_CHECKOUT — operator-set build flag.
  //   2. checkoutMode === "local_dev" — confirmed by the API after we ask it
  //      to start a session.
  const localFakeOptIn = String(import.meta.env.VITE_ALLOW_LOCAL_FAKE_CHECKOUT || "").toLowerCase() === "true";
  const isLocalFakeCheckout = checkoutMode === "local_dev" || localFakeOptIn;

  useEffect(() => {
    if (!orderId || (gig && pkg)) return undefined;
    let alive = true;
    const fetchOrder = async () => {
      try {
        setCheckoutLoading(true);
        setCheckoutError("");
        const response = await axiosInstance.get(`/orders/${orderId}`);
        if (!alive) return;
        const loadedOrder = response.data?.data;
        if (!loadedOrder) throw new Error("Order not found");
        setOrder(loadedOrder);
        setGig(loadedOrder.gig || null);
        setPkg({
          name: loadedOrder.package || decodeURIComponent(pkgName || ""),
          price: Number(loadedOrder.totalPrice || 0),
          description: loadedOrder.gig?.description || "",
          deliveryTime: loadedOrder.gig?.deliveryTime,
        });
        setOrderNumber(loadedOrder.orderNumber || "");
        setTotalPrice(Number(loadedOrder.totalPrice || 0));
      } catch (error) {
        if (alive) setCheckoutError(error.response?.data?.message || error.message || "Failed to load checkout order.");
      } finally {
        if (alive) setCheckoutLoading(false);
      }
    };
    fetchOrder();
    return () => {
      alive = false;
    };
  }, [gig, orderId, pkg, pkgName]);

  const createHostedCheckout = async () => {
    setIsPaying(true);
    setCheckoutError("");
    try {
      const response = await axiosInstance.post(`/orders/${orderId}/checkout/session`, {
        promoCode: promoCode.trim() || null,
      });
      const data = response.data?.data || {};
      setPricing(data.pricing || null);
      setCheckoutMode(data.mode || null);
      if (data.order) {
        setOrder(data.order);
        setTotalPrice(Number(data.order.totalPrice || data.pricing?.totalPrice || totalPrice || 0));
      }
      if (data.mode === "local_dev") {
        const complete = await axiosInstance.post(`/orders/${orderId}/checkout/complete`, {
          paymentMethod: "local_dev_checkout",
          metadata: { promoCode: promoCode.trim() || null },
        });
        const paid = complete.data?.data || {};
        navigate(`/checkout/${gigId}/${pkgName}/success?orderId=${orderId}`, {
          replace: true,
          state: {
            order: paid.order,
            transaction: paid.transaction,
            gig: paid.order?.gig || gig,
            pkg,
          },
        });
        return;
      }
      if (!data.url) throw new Error("Hosted checkout URL was not returned");
      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(error.response?.data?.message || error.message || "Could not start secure checkout.");
    } finally {
      setIsPaying(false);
    }
  };

  if (checkoutLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Loading checkout...</div>;
  }

  if (!gig || !pkg || !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Checkout session unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">
            {checkoutError || "We could not find the order created for this checkout. Please return to the gig and try again."}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/checkout/${gigId}/${pkgName}`)}
            className="mt-5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Back to project brief
          </button>
        </div>
      </div>
    );
  }

  const displayPricing = pricing || order?.metadata?.checkoutPricing || null;
  const totalAmount = Number(displayPricing?.totalPrice ?? totalPrice ?? pkg.price ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Secure Checkout</h1>
          <p className="text-gray-600">Vidlancing redirects you to a hosted payment page. Card details never touch our servers or frontend.</p>
        </div>

        {isLocalFakeCheckout && (
          <div className="mb-8 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">!</span>
              <div className="text-sm text-amber-900">
                <p className="font-semibold uppercase tracking-wide text-amber-800">Local development mode — no real payment</p>
                <p className="mt-1">
                  This environment has Stripe disabled. Clicking continue will mark the order as paid via the local fake-checkout endpoint so you can test the rest of the flow. <strong>No money is charged, no Stripe webhook is fired, and no escrow is actually held.</strong> Set <code className="rounded bg-white/60 px-1 py-0.5 text-[11px]">VITE_ALLOW_LOCAL_FAKE_CHECKOUT=false</code> and configure Stripe before any beta or staging traffic.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <aside className="order-2 lg:order-1">
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                <ShieldCheckIcon className="mr-2 h-5 w-5 text-green-500" />
                Verified Order Summary
              </h3>
              <div className="space-y-4">
                <SummaryRow label={pkg.name} value={`₹${Number(displayPricing?.subtotal ?? pkg.price ?? 0).toFixed(2)}`} />
                {displayPricing?.discountAmount > 0 && (
                  <SummaryRow label={`Discount ${displayPricing.discountCode || ""}`} value={`-₹${Number(displayPricing.discountAmount).toFixed(2)}`} tone="green" />
                )}
                <SummaryRow label="Tax" value={`₹${Number(displayPricing?.taxAmount || 0).toFixed(2)}`} />
                <SummaryRow label="Client service fee" value={`₹${Number(displayPricing?.clientFeeAmount || 0).toFixed(2)}`} />
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <div className="flex items-center text-sm text-purple-700">
                    <ClockIcon className="mr-2 h-4 w-4" />
                    <span className="font-medium">Order #{orderNumber || orderId}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="order-1 lg:order-2 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <div className="mb-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Hosted checkout, webhook-confirmed escrow
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Pay securely with Stripe Checkout</h2>
                <p className="text-sm text-gray-600">
                  You will be redirected to Stripe to enter payment details. After Stripe confirms payment through a signed webhook, the order moves to active escrow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Cards", "Wallets", "Bank redirects"].map((method) => (
                  <div key={method} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <CreditCardIcon className="h-6 w-6 text-purple-600" />
                    <p className="mt-2 text-sm font-semibold text-gray-900">{method}</p>
                    <p className="mt-1 text-xs text-gray-500">Handled by the payment provider.</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  <TagIcon className="mr-2 h-4 w-4" />
                  Promo code
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter promo code"
                />
                <p className="mt-2 text-xs text-gray-500">Discounts, taxes, service fees, and payouts are recalculated and verified on the backend before checkout starts.</p>
              </div>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  By proceeding, you agree to Vidlancing&apos;s Terms of Service and Refund Policy. We do not store card numbers, CVV, UPI IDs, wallet credentials, or bank login details.
                </p>
              </div>

              {checkoutError && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {checkoutError}
                </div>
              )}

              <button
                type="button"
                onClick={createHostedCheckout}
                disabled={isPaying}
                className={`mt-6 flex w-full items-center justify-center rounded-lg px-6 py-4 font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-gray-400 ${
                  isLocalFakeCheckout ? "bg-amber-600 hover:bg-amber-700" : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isPaying ? (
                  isLocalFakeCheckout ? "Completing local fake checkout..." : "Starting secure checkout..."
                ) : (
                  <>
                    <ArrowTopRightOnSquareIcon className="mr-2 h-5 w-5" />
                    {isLocalFakeCheckout
                      ? `Use Local Fake Checkout (no charge) - ₹${totalAmount.toFixed(2)}`
                      : `Continue to Hosted Checkout - ₹${totalAmount.toFixed(2)}`}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-start rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircleIcon className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Payment success is confirmed only by the provider webhook before escrow becomes active.</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone = "default" }) {
  return (
    <div className={`flex justify-between text-sm ${tone === "green" ? "text-green-600" : "text-gray-600"}`}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
