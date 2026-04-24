import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, CreditCard, Users, Building2, Palette, Cpu, Star } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const TYPE_META = {
  SERVICE_FEE: { icon: DollarSign, color: 'bg-green-500', label: 'Service Fees' },
  SUBSCRIPTION: { icon: Star, color: 'bg-purple-500', label: 'Subscriptions' },
  TEMPLATE_COMMISSION: { icon: Palette, color: 'bg-blue-500', label: 'Template Commission' },
  CLOUD_RENDERING: { icon: Cpu, color: 'bg-orange-500', label: 'Cloud Rendering' },
  FEATURED_LISTING: { icon: TrendingUp, color: 'bg-amber-500', label: 'Featured Listings' },
  ENTERPRISE: { icon: Building2, color: 'bg-red-500', label: 'Enterprise' },
};

export default function RevenueDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/revenue/dashboard');
      setData(res.data.data);
    } catch { /* admin only */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-green-500" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Admin access required</div>
  );

  const revenueTypes = data.revenueByType || [];
  const grandTotal = data.grandTotal || 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Revenue Dashboard</h1>
          <p className="text-gray-500 mb-8">Platform earnings overview</p>
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: `$${(grandTotal / 100).toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
            { label: 'Active Subscriptions', value: data.activeSubscriptions, icon: Users, color: 'text-purple-400' },
            { label: 'Enterprise Accounts', value: data.activeEnterpriseAccounts, icon: Building2, color: 'text-orange-400' },
            { label: 'Revenue Streams', value: revenueTypes.length, icon: CreditCard, color: 'text-blue-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue by Type */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Revenue by Stream</h2>
            <div className="space-y-4">
              {revenueTypes.map((r) => {
                const meta = TYPE_META[r.type] || { icon: DollarSign, color: 'bg-gray-500', label: r.type };
                const pct = grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0;
                return (
                  <div key={r.type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`${meta.color} p-1 rounded`}><meta.icon className="w-3 h-3" /></div>
                        <span className="text-sm">{meta.label}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">${(Number(r.total) / 100).toLocaleString()}</span>
                        <span className="text-gray-500 ml-2">({r.count} txns)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 1 }} className={`${meta.color} h-2 rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly trend visualization */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Monthly Trend</h2>
            <div className="space-y-3">
              {(data.monthlyBreakdown || []).slice(0, 12).map((m) => {
                const label = new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const meta = TYPE_META[m.type] || { color: 'bg-gray-500', label: m.type };
                return (
                  <div key={`${m.month}-${m.type}`} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">{label}</span>
                    <div className={`${meta.color} rounded-full h-2 flex-1`} style={{
                      maxWidth: `${Math.min(100, (Number(m.total) / Math.max(1, grandTotal)) * 500)}%`
                    }} />
                    <span className="text-xs text-gray-400 w-20 text-right">${(Number(m.total) / 100).toLocaleString()}</span>
                  </div>
                );
              })}
              {(data.monthlyBreakdown || []).length === 0 && (
                <p className="text-gray-600 text-center py-8">No revenue data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
