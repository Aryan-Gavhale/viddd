import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, BarChart, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const formatCurrency = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

export default function EarningsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    axiosInstance
      .get("/analytics/user")
      .then((res) => {
        if (alive) setStats(res.data?.data || null);
      })
      .catch((e) => {
        if (alive) setError(e?.response?.data?.message || "Could not load earnings");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const total = Number(stats?.totalEarnings ?? 0);
  const completed = Number(stats?.completedOrdersAsFreelancer ?? 0);
  const txCount = Number(stats?.totalTransactions ?? 0);
  const txVolume = Number(stats?.transactionVolume ?? 0);
  const pending = Math.max(0, txVolume - total);
  const average = completed > 0 ? total / completed : 0;
  const hasData = stats != null && (total !== 0 || completed !== 0 || txCount !== 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Earnings</h3>
        <DollarSign className="h-5 w-5 text-gray-500" />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : (
        <>
          {!hasData && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Sample placeholder — real earnings appear here once you complete and get paid for an order.
            </p>
          )}
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            <p className="flex items-center text-sm text-gray-500">
              <TrendingUp className="mr-1 h-4 w-4" />
              {txCount} transactions to date
            </p>
          </div>
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completed Projects</span>
              <span className="font-medium text-gray-900">{completed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pending Payments</span>
              <span className="font-medium text-gray-900">{formatCurrency(pending)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Average Project Value</span>
              <span className="font-medium text-gray-900">{formatCurrency(average)}</span>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
      >
        <BarChart className="h-4 w-4" />
        View Detailed Report
      </button>
    </div>
  );
}
