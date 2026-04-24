import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Award, Zap, Star, Trophy, Crown, Shield, Clock, Heart, Users,
  Film, Flag, Sparkles, Loader2, Lock, CheckCircle2, Rocket,
} from "lucide-react";

const ICON_MAP = {
  zap: Zap, star: Star, rocket: Rocket, crown: Crown, sparkles: Sparkles,
  trophy: Trophy, clock: Clock, heart: Heart, shield: Shield,
  users: Users, film: Film, flag: Flag, award: Award,
};

const COLOR_MAP = {
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  indigo: "from-indigo-500 to-purple-500",
  purple: "from-purple-500 to-fuchsia-500",
  blue: "from-blue-500 to-cyan-500",
  pink: "from-pink-500 to-rose-500",
  orange: "from-orange-500 to-red-500",
};

export default function BadgeAchievements() {
  const [rules, setRules] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, badgesRes] = await Promise.allSettled([
        axiosInstance.get("/auto-badges/rules"),
        axiosInstance.get("/auto-badges/my"),
      ]);
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value.data.data || []);
      if (badgesRes.status === "fulfilled") setMyBadges(badgesRes.value.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const checkBadges = async () => {
    setChecking(true);
    try {
      const { data } = await axiosInstance.post("/auto-badges/check");
      if (data.data?.awarded?.length > 0) {
        setNewBadges(data.data.awarded);
        toast.success(`You earned ${data.data.awarded.length} new badge(s)!`);
        fetchData();
      } else {
        toast.info("No new badges earned yet — keep going!");
      }
    } catch { toast.error("Failed to check badges"); }
    finally { setChecking(false); }
  };

  const earnedNames = new Set(myBadges.map((b) => b.name));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/25">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Achievements</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Earn badges through real actions — not admin handouts. Prove your worth.
        </p>
        <button onClick={checkBadges} disabled={checking}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-xl disabled:opacity-60">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Check for New Badges
        </button>
      </div>

      {/* Earned badges */}
      {myBadges.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
            Your Badges ({myBadges.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {myBadges.map((b, i) => {
              const Icon = ICON_MAP[b.icon] || Award;
              return (
                <motion.div key={b.id}
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm dark:from-amber-900/20 dark:to-orange-900/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Earned {new Date(b.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle2 className="ml-1 h-4 w-4 text-emerald-500" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* All achievement rules */}
      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">All Achievements</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule, i) => {
          const earned = earnedNames.has(rule.badgeName);
          const Icon = ICON_MAP[rule.icon] || Award;
          const grad = COLOR_MAP[rule.color] || COLOR_MAP.indigo;
          return (
            <motion.div key={rule.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`relative overflow-hidden rounded-2xl border p-5 transition ${earned ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg ${!earned ? "opacity-40 grayscale" : ""}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{rule.badgeName}</h3>
                    {earned ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>
                  <div className="mt-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${earned ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {earned ? "Earned" : `Requires: ${rule.triggerType.replace(/_/g, " ").toLowerCase()} × ${rule.triggerValue}`}
                    </span>
                  </div>
                </div>
              </div>
              {earned && (
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-400/10" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* New badges celebration */}
      {newBadges.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-xl"
        >
          <h3 className="mb-2 text-lg font-bold">Congratulations!</h3>
          <p className="text-sm opacity-90">You just earned: {newBadges.join(", ")}</p>
        </motion.div>
      )}
    </div>
  );
}
