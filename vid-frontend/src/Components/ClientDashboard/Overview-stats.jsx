import { useEffect, useState } from "react";
import { TrendingUp, Clock, DollarSign, Users, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const formatCurrency = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

export default function OverviewStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      axiosInstance.get("/analytics/user"),
      axiosInstance.get("/orders/client").catch(() => null),
    ])
      .then(([analyticsRes, ordersRes]) => {
        if (!alive) return;
        const analytics = analyticsRes.data?.data || {};
        const orderRows = ordersRes?.data?.data?.orders || ordersRes?.data?.data || [];
        const orders = Array.isArray(orderRows) ? orderRows : [];
        const active = orders.filter((o) => ["CURRENT", "IN_PROGRESS", "REVIEW"].includes(String(o.status))).length;
        const pending = orders.filter((o) => ["DELIVERED", "REVIEW"].includes(String(o.status))).length;
        const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const dueThisWeek = orders.filter((o) => {
          const due = o.dueDate || o.deliveryDate;
          if (!due) return false;
          const t = new Date(due).getTime();
          return Number.isFinite(t) && t <= oneWeek && t >= Date.now();
        }).length;
        setData({
          activeProjects: active,
          pendingDeliveries: pending,
          deliveriesDueThisWeek: dueThisWeek,
          totalSpent: Number(analytics.totalSpentAsClient || 0),
          completedOrders: Number(analytics.completedOrdersAsClient || 0),
          totalTransactions: Number(analytics.totalTransactions || 0),
        });
      })
      .catch((e) => {
        if (alive) setError(e?.response?.data?.message || "Could not load overview");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-32 items-center justify-center rounded-2xl border border-gray-200/50 bg-white/80 backdrop-blur-sm"
          >
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const active = Number(data?.activeProjects ?? 0);
  const pending = Number(data?.pendingDeliveries ?? 0);
  const dueThisWeek = Number(data?.deliveriesDueThisWeek ?? 0);
  const totalSpent = Number(data?.totalSpent ?? 0);
  const completedOrders = Number(data?.completedOrders ?? 0);
  const totalTransactions = Number(data?.totalTransactions ?? 0);

  const hasAnySignal = active || pending || totalSpent || completedOrders;

  const stats = [
    {
      title: "Active Projects",
      value: String(active),
      change: `${active} in progress`,
      icon: TrendingUp,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Pending Deliveries",
      value: String(pending),
      change: dueThisWeek > 0 ? `${dueThisWeek} due this week` : "No deliveries this week",
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Total Spent",
      value: formatCurrency(totalSpent),
      change: `Across ${completedOrders} completed orders`,
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Transactions",
      value: String(totalTransactions),
      change: totalTransactions > 0 ? "Lifetime payments" : "No transactions yet",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-3">
      {!hasAnySignal && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          No projects yet — these tiles will populate once you have an active order.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.change}</p>
              </div>
              <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
