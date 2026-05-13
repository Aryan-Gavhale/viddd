import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../utils/axios";
import {
  Briefcase,
  Heart,
  Layers,
  Loader2,
  Search,
  Trash2,
  Users,
} from "lucide-react";

const FILTERS = [
  { id: "ALL", label: "All", icon: Heart },
  { id: "GIG", label: "Gigs", icon: Layers },
  { id: "FREELANCER", label: "Editors", icon: Users },
  { id: "JOB", label: "Jobs", icon: Briefcase },
];

const TYPE_META = {
  GIG: { label: "Gig", icon: Layers, tone: "bg-violet-50 text-violet-700" },
  FREELANCER: { label: "Editor", icon: Users, tone: "bg-blue-50 text-blue-700" },
  JOB: { label: "Job", icon: Briefcase, tone: "bg-emerald-50 text-emerald-700" },
};

export default function SavedItemsPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byType: {} });
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (filter !== "ALL") params.entityType = filter;
      const [listRes, summaryRes] = await Promise.all([
        axiosInstance.get("/saved-items", { params }),
        axiosInstance.get("/saved-items/summary"),
      ]);
      setItems(listRes.data?.data?.items || []);
      setSummary(summaryRes.data?.data || { total: 0, byType: {} });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((saved) => {
      const item = saved.item || {};
      return [item.title, item.subtitle, saved.entityType].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [items, query]);

  const removeSaved = async (savedItemId) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== savedItemId));
    try {
      await axiosInstance.delete(`/saved-items/items/${savedItemId}`);
      window.dispatchEvent(new CustomEvent("saved-items:changed"));
      await loadSaved();
    } catch (error) {
      setItems(previous);
      console.error("Failed to remove saved item", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 to-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm ring-1 ring-rose-100">
              <Heart className="h-3.5 w-3.5 fill-current" />
              Personal shortlist
            </div>
            <h1 className="mt-3 text-3xl font-bold text-gray-950">Saved Items</h1>
            <p className="mt-1 text-sm text-gray-600">
              Keep your favorite editors, gigs, and jobs in one decision board.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total saved</p>
            <p className="text-3xl font-bold text-gray-950">{summary.total || 0}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your saved items..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none ring-rose-500 transition focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.id;
              const count = f.id === "ALL" ? summary.total || 0 : summary.byType?.[f.id] || 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-gray-950 text-white"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-rose-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/15" : "bg-gray-100"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-3xl bg-white py-20 shadow-sm ring-1 ring-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-20 text-center shadow-sm ring-1 ring-gray-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <Heart className="h-8 w-8 text-rose-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Nothing saved here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Click the heart on an editor, gig, or job. It will appear here instantly and stay synced across devices.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/gigs" className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white">
                Explore gigs
              </Link>
              <Link to="/find-work" className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
                Find jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((saved) => {
              const item = saved.item || {};
              const meta = TYPE_META[saved.entityType] || TYPE_META.GIG;
              const Icon = meta.icon;
              return (
                <div key={saved.id} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <Link to={item.href || "#"} className="block">
                    <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center ${meta.tone}`}>
                          <Icon className="h-12 w-12" />
                        </div>
                      )}
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-base font-bold text-gray-950">{item.title}</h3>
                      <p className="mt-1 truncate text-sm text-gray-500">{item.subtitle || meta.label}</p>
                      <p className="mt-3 text-xs text-gray-400">
                        Saved {new Date(saved.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <Link to={item.href || "#"} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                      Open
                    </Link>
                    <button
                      onClick={() => removeSaved(saved.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
