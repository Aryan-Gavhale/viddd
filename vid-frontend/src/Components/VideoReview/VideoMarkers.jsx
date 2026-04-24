import { useState, useMemo, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatTimecode } from "./formatTimecode.js";

/**
 * Renders timecode markers above the progress track.
 * @param {object} props
 * @param {Array<{id:number|string, timecode:number, resolved?:boolean, content?:string, userName?:string}>} props.markers
 * @param {number} props.duration
 * @param {number} props.currentTime
 * @param {(timecode: number) => void} props.onMarkerClick
 */
export default function VideoMarkers({ markers, duration, currentTime, onMarkerClick }) {
  const [hover, setHover] = useState(null);
  const tipId = useId();

  const safeDur = useMemo(() => (duration > 0 ? duration : 1), [duration]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-6 items-end justify-center">
      {markers.map((m) => {
        const pct = Math.min(100, Math.max(0, (Number(m.timecode) / safeDur) * 100));
        const isNearPlayhead = Math.abs(Number(m.timecode) - currentTime) < 0.4;
        const resolved = Boolean(m.resolved);
        const color = resolved
          ? "bg-emerald-500 shadow-emerald-500/50"
          : Number(m.id) % 2 === 0
            ? "bg-sky-400 shadow-sky-500/50"
            : "bg-amber-400 shadow-amber-500/50";

        return (
          <div
            key={m.id}
            className="pointer-events-auto absolute bottom-0 -translate-x-1/2"
            style={{ left: `${pct}%` }}
            onMouseEnter={() => setHover(m.id)}
            onMouseLeave={() => setHover((h) => (h === m.id ? null : h))}
          >
            <button
              type="button"
              aria-label={`Comment at ${formatTimecode(m.timecode)}${resolved ? ", resolved" : ""}`}
              aria-describedby={hover === m.id ? `${tipId}-${m.id}` : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick(Number(m.timecode));
              }}
              className={`relative flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-900/40 shadow transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950 ${color} ${
                isNearPlayhead ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900/50" : ""
              }`}
            />
            <AnimatePresence>
              {hover === m.id && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  id={`${tipId}-${m.id}`}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-600/60 bg-slate-900/95 px-2.5 py-2 text-left text-xs text-slate-100 shadow-xl ring-1 ring-white/5 backdrop-blur dark:bg-slate-800/95"
                >
                  <p className="mb-0.5 font-mono text-[10px] text-indigo-300">{formatTimecode(m.timecode)}</p>
                  {m.userName && <p className="font-medium text-slate-200">{m.userName}</p>}
                  <p className="mt-0.5 line-clamp-3 text-slate-400">
                    {(m.content || "").trim() || "—"}
                  </p>
                  {resolved && (
                    <span className="mt-1 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      Resolved
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
