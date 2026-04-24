import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, CreditCard, Shield, Plus, ChevronRight, Settings, BarChart3, Workflow, Key } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { toast } from 'react-toastify';

const PLANS = {
  STANDARD: { label: 'Standard', price: '$49.99/mo', color: 'from-blue-600 to-cyan-700', seats: 5 },
  PREMIUM: { label: 'Premium', price: '$99.99/mo', color: 'from-purple-600 to-pink-700', seats: 25 },
  SCALE: { label: 'Scale', price: '$249.99/mo', color: 'from-amber-500 to-red-600', seats: 100 },
};

export default function EnterpriseDashboard() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ companyName: '', plan: 'STANDARD' });
  const [inviteId, setInviteId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/revenue/enterprise/me');
      setAccount(res.data.data);
    } catch { setAccount(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const handleCreate = async () => {
    if (!createForm.companyName.trim()) return toast.error('Company name required');
    setCreating(true);
    try {
      await axiosInstance.post('/revenue/enterprise', createForm);
      toast.success('Enterprise account created!');
      setShowCreate(false);
      fetchAccount();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setCreating(false); }
  };

  const handleInvite = async () => {
    if (!inviteId) return;
    try {
      await axiosInstance.post('/revenue/enterprise/invite', { userId: parseInt(inviteId), role: 'MEMBER' });
      toast.success('Member invited!');
      setInviteId('');
      fetchAccount();
    } catch (e) { toast.error(e.response?.data?.message || 'Invite failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500" />
    </div>
  );

  if (!account && !showCreate) return (
    <div className="min-h-screen bg-gray-950 text-white py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Building2 className="w-20 h-20 text-orange-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Enterprise for Production Companies</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
            Team management, bulk hiring, custom workflows, and dedicated support for your production studio.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {Object.entries(PLANS).map(([key, p]) => (
              <motion.div key={key} whileHover={{ scale: 1.03 }}
                className={`bg-gradient-to-br ${p.color} rounded-2xl p-6 cursor-pointer`}
                onClick={() => { setCreateForm(f => ({ ...f, plan: key })); setShowCreate(true); }}>
                <h3 className="text-xl font-bold mb-2">{p.label}</h3>
                <p className="text-3xl font-bold mb-4">{p.price}</p>
                <p className="text-sm opacity-80">Up to {p.seats} team seats</p>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span>Get started</span> <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: Users, label: 'Team Management', desc: 'Manage editors, assign roles' },
              { icon: Workflow, label: 'Custom Workflows', desc: 'Design your production pipeline' },
              { icon: Key, label: 'SSO & API', desc: 'Enterprise-grade security' },
              { icon: BarChart3, label: 'Analytics', desc: 'Deep insights & reporting' },
            ].map(f => (
              <div key={f.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left">
                <f.icon className="w-5 h-5 text-orange-400 mb-2" />
                <h4 className="font-semibold mb-1">{f.label}</h4>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-2xl font-bold mb-6">Create Enterprise Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                  <input value={createForm.companyName} onChange={e => setCreateForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white" placeholder="Acme Studios" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Plan</label>
                  <select value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
                    {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.price}</option>)}
                  </select>
                </div>
                <button onClick={handleCreate} disabled={creating}
                  className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-xl font-semibold transition">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );

  const members = Array.isArray(account.members) ? account.members.filter(m => m.id != null) : [];
  const p = PLANS[account.plan] || PLANS.STANDARD;
  const features = typeof account.features === 'string' ? JSON.parse(account.features) : (account.features || {});

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className={`bg-gradient-to-r ${p.color} rounded-2xl p-8 mb-8`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Building2 className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold">{account.companyName}</h1>
                  <p className="opacity-80">{p.label} Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold">{account.usedSeats}/{account.maxSeats}</div>
                  <div className="opacity-70">Seats</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${((account.spentThisMonth || 0) / 100).toFixed(0)}</div>
                  <div className="opacity-70">Spent</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Team Members */}
            <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" /> Team Members
                </h2>
                <span className="text-sm text-gray-500">{members.length} of {account.maxSeats}</span>
              </div>
              <div className="space-y-3 mb-6">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {String(m.userId).charAt(0)}
                      </div>
                      <span>User #{m.userId}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.role === 'OWNER' ? 'bg-amber-700' : 'bg-gray-700'}`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={inviteId} onChange={e => setInviteId(e.target.value)} placeholder="User ID to invite"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" />
                <button onClick={handleInvite}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Invite
                </button>
              </div>
            </div>

            {/* Features & Settings */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-400" /> Features
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Bulk Hiring', on: features.bulkHiring || account.bulkHiring },
                    { label: 'Custom Workflows', on: features.customWorkflows || account.customWorkflows },
                    { label: 'API Access', on: features.apiAccess || account.apiAccess },
                    { label: 'SSO', on: features.ssoEnabled || account.ssoEnabled },
                    { label: 'Dedicated Manager', on: features.dedicatedManager },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-gray-400">{f.label}</span>
                      <span className={f.on ? 'text-green-400' : 'text-gray-600'}>{f.on ? '✓ Enabled' : '— Unavailable'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-green-400" /> Budget
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Budget</span>
                    <span className="font-semibold">${((account.monthlyBudget || 0) / 100).toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{
                      width: `${Math.min(100, ((account.spentThisMonth || 0) / Math.max(1, account.monthlyBudget || 1)) * 100)}%`
                    }} />
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    ${((account.spentThisMonth || 0) / 100).toFixed(0)} spent
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-purple-400" /> Security
                </h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>• End-to-end encrypted file transfers</p>
                  <p>• SOC 2 Type II compliant</p>
                  <p>• Role-based access control</p>
                  <p>• Audit logging</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
