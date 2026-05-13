import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Heart, Layers, Loader2, Trash2, Users } from "lucide-react";
import axiosInstance from "../../utils/axios";

const TYPE_META = {
  GIG: { label: "Gig", icon: Layers, tone: "bg-violet-50 text-violet-600" },
  FREELANCER: { label: "Editor", icon: Users, tone: "bg-blue-50 text-blue-600" },
  JOB: { label: "Job", icon: Briefcase, tone: "bg-emerald-50 text-emerald-600" },
};

export const LikedSection = ({ user }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byType: {} });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setSummary({ total: 0, byType: {} });
      return;
    }
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        axiosInstance.get("/saved-items", { params: { limit: 6 } }),
        axiosInstance.get("/saved-items/summary"),
      ]);
      setItems(listRes.data?.data?.items || []);
      setSummary(summaryRes.data?.data || { total: 0, byType: {} });
    } catch (error) {
      console.error("Failed to load saved items", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    const onChanged = () => fetchSaved();
    window.addEventListener("saved-items:changed", onChanged);
    return () => window.removeEventListener("saved-items:changed", onChanged);
  }, [fetchSaved]);

  useEffect(() => {
    const close = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleOpen = () => {
    if (!user?.id) {
      navigate("/login");
      return;
    }
    setIsOpen((prev) => !prev);
    if (!isOpen) fetchSaved();
  };

  const removeItem = async (savedItemId) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== savedItemId));
    setSummary((prev) => ({ ...prev, total: Math.max(0, Number(prev.total || 0) - 1) }));
    try {
      await axiosInstance.delete(`/saved-items/items/${savedItemId}`);
      window.dispatchEvent(new CustomEvent("saved-items:changed"));
    } catch (error) {
      setItems(previous);
      console.error("Failed to remove saved item", error);
    }
  };

  const total = Number(summary.total || 0);

  return (
    <div ref={containerRef} className="relative ml-2">
      <button
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-rose-50 transition-colors"
        onClick={toggleOpen}
        aria-label="Saved liked items"
      >
        <Heart
          className={`w-5 h-5 transition-all duration-300 ${
            total > 0 ? "text-rose-500 fill-current" : "text-gray-500 hover:text-rose-400"
          }`}
        />

        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Liked Items</h3>
                <p className="text-xs text-gray-500">Saved editors, gigs, and jobs</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-rose-600">{total}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">saved</p>
              </div>
            </div>
            {total > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <span key={type} className={`rounded-lg px-2 py-1 ${meta.tone}`}>
                    {meta.label}: {summary.byType?.[type] || 0}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-gray-500">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-rose-500" />
                Loading saved items…
              </div>
            ) : items.length > 0 ? (
              <div className="py-2">
                {items.map((saved) => {
                  const item = saved.item || {};
                  const meta = TYPE_META[saved.entityType] || TYPE_META.GIG;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={saved.id}
                      className="group flex items-center gap-3 px-4 py-3 hover:bg-rose-50/60 transition-colors"
                    >
                      <Link
                        to={item.href || "#"}
                        onClick={() => setIsOpen(false)}
                        className="flex flex-1 min-w-0 items-center gap-3"
                      >
                        <div className={`w-11 h-11 rounded-xl ${meta.tone} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle || meta.label}</p>
                          <span className={`mt-1 inline-flex text-[10px] px-1.5 py-0.5 rounded-md ${meta.tone}`}>
                            {meta.label}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeItem(saved.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-white transition-all"
                        aria-label="Remove saved item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 px-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-3">
                  <Heart className="w-7 h-7 text-rose-300" />
                </div>
                <p className="text-sm font-semibold text-gray-800">No liked items yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Save editors, gigs, and jobs to compare them later.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <Link
              to="/saved"
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-center text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-purple-600 rounded-xl hover:from-rose-600 hover:to-purple-700 transition-colors"
            >
              View saved workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
