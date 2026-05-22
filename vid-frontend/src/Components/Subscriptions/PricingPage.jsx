import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Zap, Crown, Rocket, Star, ArrowRight, Sparkles } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { toast } from 'react-toastify';

const TIER_STYLES = {
  FREE: { gradient: 'from-slate-600 to-slate-800', icon: Star, accent: 'text-slate-300', badge: 'bg-slate-700' },
  PRO: { gradient: 'from-violet-600 to-purple-800', icon: Zap, accent: 'text-violet-300', badge: 'bg-violet-700' },
  BUSINESS: { gradient: 'from-amber-500 to-orange-700', icon: Crown, accent: 'text-amber-300', badge: 'bg-amber-600' },
};

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [mySub, setMySub] = useState(null);
  const [cycle, setCycle] = useState('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axiosInstance.get('/revenue/subscriptions/plans'),
        axiosInstance.get('/revenue/subscriptions/me').catch(() => null),
      ]);
      setPlans(plansRes.data.data || []);
      setMySub(subRes?.data?.data || null);
    } catch { /* plans fetch fail is fine */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      await axiosInstance.post('/revenue/subscriptions', { planId, billingCycle: cycle });
      toast.success('Subscribed successfully!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Subscription failed');
    } finally { setSubscribing(null); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription?')) return;
    try {
      await axiosInstance.delete('/revenue/subscriptions');
      toast.success('Subscription cancelled');
      setMySub(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1 mb-6">
            <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span className="text-sm text-violet-700 dark:text-violet-300">Choose your plan</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Lower fees than Fiverr or Upwork. Keep more of what you earn.
          </p>

          {/* Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={cycle === 'MONTHLY' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}>Monthly</span>
            <button
              onClick={() => setCycle(c => c === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
              className={`relative w-14 h-7 rounded-full transition-colors ${cycle === 'YEARLY' ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow"
                animate={{ left: cycle === 'YEARLY' ? '1.75rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            </button>
            <span className={cycle === 'YEARLY' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}>
              Yearly <span className="text-green-600 dark:text-green-400 text-xs font-medium ml-1">Save 17%</span>
            </span>
          </div>
        </motion.div>

        {/* Service Fee Banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-300 dark:border-emerald-700/30 rounded-2xl p-6 mb-12 text-center">
          <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Industry-Leading Low Fees</h3>
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div><span className="text-emerald-600 dark:text-emerald-400 font-bold text-xl">10-15%</span> <span className="text-gray-600 dark:text-gray-400">from freelancer</span></div>
            <div className="text-gray-500 dark:text-gray-600">vs Fiverr's 20%</div>
            <div><span className="text-emerald-600 dark:text-emerald-400 font-bold text-xl">3-5%</span> <span className="text-gray-600 dark:text-gray-400">from client</span></div>
            <div className="text-gray-500 dark:text-gray-600">vs Upwork's 5-20%</div>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => {
            const style = TIER_STYLES[plan.tier] || TIER_STYLES.FREE;
            const Icon = style.icon;
            const price = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
            const isActive = mySub?.planId === plan.id;
            const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className={`relative rounded-2xl overflow-hidden ${plan.tier === 'PRO' ? 'ring-2 ring-violet-500 scale-105' : ''}`}
              >
                {plan.tier === 'PRO' && (
                  <div className="absolute top-0 left-0 right-0 bg-violet-600 text-center py-1 text-xs font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </div>
                )}
                <div className={`bg-gradient-to-br ${style.gradient} p-8 text-white ${plan.tier === 'PRO' ? 'pt-10' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${style.badge} p-2 rounded-lg`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${(price / 100).toFixed(0)}</span>
                    {plan.tier !== 'FREE' && <span className="text-gray-300">/{cycle === 'YEARLY' ? 'yr' : 'mo'}</span>}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-8 border border-gray-200 dark:border-gray-800 rounded-b-2xl">
                  <ul className="space-y-3 mb-8">
                    {features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle className={`w-4 h-4 mt-0.5 ${style.accent} shrink-0`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isActive ? (
                    <div className="space-y-2">
                      <div className="text-center text-sm text-green-700 dark:text-green-400 font-medium py-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        Current Plan
                      </div>
                      <button onClick={handleCancel} className="w-full text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition">
                        Cancel subscription
                      </button>
                    </div>
                  ) : plan.tier === 'FREE' ? (
                    <div className="text-center text-sm text-gray-500 py-2">Free forever</div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                      className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2
                        ${plan.tier === 'PRO'
                          ? 'bg-violet-600 hover:bg-violet-500 text-white'
                          : 'bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white'}`}
                    >
                      {subscribing === plan.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                      ) : (
                        <>Get Started <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-10 border border-gray-300 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Enterprise</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
            For production companies that need team management, bulk hiring, custom workflows, SSO, and dedicated support.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-gray-700 dark:text-gray-400">
            {['Team seats', 'Bulk hiring', 'Custom workflows', 'SSO & API access', 'Dedicated manager', 'Monthly budget controls'].map(f => (
              <span key={f} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-transparent px-3 py-1 rounded-full">
                <CheckCircle className="w-3 h-3 text-orange-500 dark:text-orange-400" /> {f}
              </span>
            ))}
          </div>
          <a href="/enterprise" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 px-8 py-3 rounded-xl font-semibold transition">
            Contact Sales <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
