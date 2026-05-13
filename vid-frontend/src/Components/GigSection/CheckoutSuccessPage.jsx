import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  FolderOpenIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "../../utils/axios";

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = location.state?.order?.id || searchParams.get("orderId");
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(Boolean(orderId && !location.state?.order));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || order) return;
    let alive = true;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/orders/${orderId}`);
        if (alive) setOrder(response.data?.data || null);
      } catch (err) {
        if (alive) setError(err.response?.data?.message || "Unable to load your order.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchOrder();
    return () => {
      alive = false;
    };
  }, [order, orderId]);

  const workspaceUrl = useMemo(
    () => (orderId ? `/client/workspace/orders/${orderId}` : "/client/workspace"),
    [orderId]
  );

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Payment completed</h1>
          <p className="mt-2 text-sm text-gray-600">
            {error || "Your payment was completed, but we could not load the order summary right now."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/client/dashboard")}
            className="mt-5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  const editorName = [order.freelancer?.user?.firstname, order.freelancer?.user?.lastname].filter(Boolean).join(" ") || "Your editor";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3">
                <CheckCircleIcon className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Payment completed</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-950">Your gig workspace is ready</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Order #{order.orderNumber} is now active. Track deliverables, upload files, chat with {editorName}, and review revisions from one workspace.
                </p>
              </div>
            </div>
            <Link
              to={workspaceUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white shadow-lg hover:bg-purple-700"
            >
              Open Gig Workspace
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SummaryCard label="Gig" value={order.gig?.title || order.title} />
            <SummaryCard label="Package" value={order.package || "Selected package"} />
            <SummaryCard label="Amount paid" value={`₹${Number(order.totalPrice || 0)}`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <NextStep
            icon={ClipboardDocumentListIcon}
            title="Review the brief"
            copy="Keep scope, package terms, and delivery deadline visible for both sides."
          />
          <NextStep
            icon={FolderOpenIcon}
            title="Share assets"
            copy="Upload source footage, references, brand files, and editor deliverables."
          />
          <NextStep
            icon={ChatBubbleLeftRightIcon}
            title="Collaborate"
            copy="Use order messages and revision notes so feedback stays tied to this purchase."
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-lg font-bold text-gray-950">{value}</p>
    </div>
  );
}

function NextStep({ icon: Icon, title, copy }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <Icon className="h-7 w-7 text-purple-600" />
      <h2 className="mt-4 font-bold text-gray-950">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{copy}</p>
    </div>
  );
}
