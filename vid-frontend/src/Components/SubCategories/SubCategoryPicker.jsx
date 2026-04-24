import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { ChevronDown, ChevronRight, Tag, Loader2 } from "lucide-react";

export default function SubCategoryPicker({ value, onChange, parentCategory, showBrowse = false }) {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedParent, setExpandedParent] = useState(parentCategory || null);

  useEffect(() => {
    axiosInstance.get("/sub-categories")
      .then(({ data }) => setCategories(data.data?.grouped || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;

  const parents = Object.keys(categories);

  if (parentCategory) {
    const subs = categories[parentCategory] || [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {subs.map((sub) => (
          <button key={sub.id} type="button"
            onClick={() => onChange(sub.name)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${value === sub.name ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}
          >{sub.name}</button>
        ))}
      </div>
    );
  }

  if (showBrowse) {
    return (
      <div className="space-y-2">
        {parents.map((parent) => {
          const subs = categories[parent] || [];
          const isOpen = expandedParent === parent;
          return (
            <div key={parent} className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <button type="button" onClick={() => setExpandedParent(isOpen ? null : parent)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-indigo-500" /> {parent}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-400">{subs.length}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap gap-1.5 p-3">
                      {subs.map((sub) => (
                        <button key={sub.id} type="button"
                          onClick={() => onChange(`${parent} > ${sub.name}`)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${value === `${parent} > ${sub.name}` ? "bg-indigo-600 text-white shadow-md" : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-700 dark:text-slate-300"}`}
                        >{sub.name}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
