import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { Award, ShieldCheck, Star, Flame, Zap, Trophy, BookOpen } from "lucide-react";

const ICON_MAP = {
  award: Award, shield: ShieldCheck, star: Star, flame: Flame, zap: Zap, trophy: Trophy, book: BookOpen,
};

const COLOR_MAP = {
  indigo: "from-indigo-500 to-purple-500 shadow-indigo-500/25",
  emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/25",
  amber: "from-amber-500 to-orange-500 shadow-amber-500/25",
  red: "from-red-500 to-rose-500 shadow-red-500/25",
  blue: "from-blue-500 to-cyan-500 shadow-blue-500/25",
  pink: "from-pink-500 to-fuchsia-500 shadow-pink-500/25",
};

export default function SkillBadges({ userId, compact = false }) {
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!userId) return;
    axiosInstance.get(`/skill-tests/badges/${userId}`)
      .then(({ data }) => setBadges(data.data || []))
      .catch(() => {});
  }, [userId]);

  if (badges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => {
          const Icon = ICON_MAP[b.icon] || Award;
          return (
            <motion.div
              key={b.id}
              whileHover={{ scale: 1.15 }}
              title={`${b.title} — ${b.score}%`}
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${COLOR_MAP[b.color] || COLOR_MAP.indigo} text-white shadow-lg`}
            >
              <Icon className="h-3.5 w-3.5" />
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <ShieldCheck className="h-4 w-4 text-indigo-500" /> Verified Skills
      </h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((b, i) => {
          const Icon = ICON_MAP[b.icon] || Award;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative"
            >
              <div className={`flex items-center gap-2 rounded-xl bg-gradient-to-br ${COLOR_MAP[b.color] || COLOR_MAP.indigo} px-3 py-2 text-white shadow-lg transition hover:shadow-xl`}>
                <Icon className="h-4 w-4" />
                <div>
                  <p className="text-xs font-semibold leading-tight">{b.title}</p>
                  <p className="text-[10px] opacity-80">{b.category} · {b.score}%</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
