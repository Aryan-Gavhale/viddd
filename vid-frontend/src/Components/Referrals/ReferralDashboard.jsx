import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Users, Gift, Copy, Share2, CheckCircle2, Loader2, DollarSign,
  TrendingUp, Link2, Award, Zap, ChevronRight, Clock,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const TIERS = [
  { name: "Bronze", min: 0, max: 4, color: "from-orange-600 to-amber-700", reward: "$10" },
  { name: "Silver", min: 5, max: 14, color: "from-slate-400 to-slate-500", reward: "$15" },
  { name: "Gold", min: 15, max: 29, color: "from-amber-400 to-yellow-500", reward: "$25" },
  { name: "Platinum", min: 30, max: Infinity, color: "from-indigo-500 to-purple-500", reward: "$50" },
];

export default function ReferralDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/referrals/stats");
      setStats(data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const { data } = await axiosInstance.post("/referrals/create");
      toast.success(`Referral code created: ${data.data.referralCode}`);
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate");
    } finally { setGenerating(false); }
  };

  const redeemReferral = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      await axiosInstance.post("/referrals/redeem", { referralCode: redeemCode.trim() });
      toast.success("Referral code redeemed! Reward applied.");
      setRedeemCode("");
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Redemption failed");
    } finally { setRedeeming(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = (code) => {
    const url = `${window.location.origin}/signup?ref=${code}`;
    if (navigator.share) {
      navigator.share({ title: "Join Vidlancing!", text: `Use my referral code ${code} and we both get rewards!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    }
  };

  const totalRedeemed = stats?.totalRedeemed || 0;
  const currentTier = TIERS.find((t) => totalRedeemed >= t.min && totalRedeemed <= t.max) || TIERS[0];
  const nextTier = TIERS.find((t) => t.min > totalRedeemed);
  const progressToNext = nextTier ? ((totalRedeemed - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/25">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Refer & Earn</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Invite friends, earn rewards, and climb tiers for bigger bonuses
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Total Referrals", value: stats?.totalReferrals || 0, icon: Link2, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Redeemed", value: totalRedeemed, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Rewards Earned", value: `$${stats?.totalRewardsEarned || 0}`, icon: DollarSign, color: "text-amber-600 dark:text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <s.icon className={`mx-auto mb-2 h-6 w-6 ${s.color}`} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tier Progress */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your Tier</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full bg-gradient-to-r ${currentTier.color} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
                {currentTier.name}
              </span>
              <span className="text-xs text-slate-500">— {currentTier.reward} per referral</span>
            </div>
          </div>
          {nextTier && (
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Next: {nextTier.name}</p>
              <p className="text-xs text-slate-400">{nextTier.min - totalRedeemed} more to go</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {TIERS.map((t, i) => (
            <div key={t.name} className="flex-1">
              <div className="mb-1 flex justify-between text-[9px] text-slate-400">
                <span>{t.name}</span>
                <span>{t.reward}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: totalRedeemed >= t.max ? "100%" : totalRedeemed >= t.min ? `${((totalRedeemed - t.min) / (t.max === Infinity ? 50 : t.max - t.min)) * 100}%` : "0%"
                  }}
                  transition={{ duration: 0.8, delay: i * 0.15 }}
                  className={`h-full rounded-full bg-gradient-to-r ${t.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generate & Share */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Share2 className="h-5 w-5 text-indigo-500" /> Share Your Code
          </h3>
          <button onClick={generateCode} disabled={generating}
            className="mb-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-60">
            {generating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><Zap className="mr-1.5 inline h-4 w-4" /> Generate New Code</>}
          </button>

          {stats?.referrals?.length > 0 && (
            <div className="space-y-2">
              {stats.referrals.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                  <div>
                    <code className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.referralCode}</code>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {r.status === "REDEEMED" ? `Redeemed by ${r.referee?.firstname || "someone"}` : "Pending"}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => copyCode(r.referralCode)} title="Copy"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => shareCode(r.referralCode)} title="Share"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <span className={`self-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${r.status === "REDEEMED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Redeem */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Gift className="h-5 w-5 text-emerald-500" /> Redeem a Code
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Got a referral code from a friend? Enter it below to claim your reward.
          </p>
          <div className="flex gap-2">
            <input className={INPUT} value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code" onKeyDown={(e) => e.key === "Enter" && redeemReferral()} />
            <button onClick={redeemReferral} disabled={redeeming || !redeemCode.trim()}
              className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
            </button>
          </div>

          {/* How it works */}
          <div className="mt-6 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">How It Works</h4>
            <div className="space-y-2">
              {[
                { step: "1", text: "Generate a unique referral code" },
                { step: "2", text: "Share it with friends or on social media" },
                { step: "3", text: "They sign up and redeem your code" },
                { step: "4", text: "You both earn rewards — you climb tiers!" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{s.step}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
