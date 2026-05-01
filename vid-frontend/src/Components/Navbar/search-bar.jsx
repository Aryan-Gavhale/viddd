import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Briefcase, Users, Layers, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axios";

const DEBOUNCE_MS = 220;
const MIN_CHARS = 2;

function defaultSearchPath(role) {
  if (role === "FREELANCER") return "/find-work";
  return "/gigs";
}

export const SearchBar = ({ role, onSearch }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ gigs: [], freelancers: [], jobs: [] });
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const requestRef = useRef(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!isFocused) return undefined;
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults({ gigs: [], freelancers: [], jobs: [] });
      setLoading(false);
      return undefined;
    }
    const myReq = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/search/suggestions", {
          params: { q: trimmed, limit: 4 },
        });
        if (myReq !== requestRef.current) return;
        const data = res.data?.data || {};
        setResults({
          gigs: data.gigs || [],
          freelancers: data.freelancers || [],
          jobs: data.jobs || [],
        });
        setOpen(true);
      } catch {
        if (myReq === requestRef.current) {
          setResults({ gigs: [], freelancers: [], jobs: [] });
        }
      } finally {
        if (myReq === requestRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, isFocused]);

  // Flatten the groups to a single list for keyboard navigation
  const flat = [
    ...results.gigs.map((g) => ({ kind: "gig", ...g })),
    ...results.freelancers.map((f) => ({ kind: "freelancer", ...f })),
    ...results.jobs.map((j) => ({ kind: "job", ...j })),
  ];

  const navigateToTarget = useCallback(
    (item) => {
      setOpen(false);
      setIsFocused(false);
      if (item.kind === "gig") navigate(`/gigs/${item.id}`);
      else if (item.kind === "freelancer") navigate(`/freelancers/${item.id}`);
      else if (item.kind === "job") navigate(`/jobs/${item.id}`);
    },
    [navigate]
  );

  const submitFreeText = useCallback(
    (q) => {
      setOpen(false);
      setIsFocused(false);
      const trimmed = (q || "").trim();
      if (!trimmed) return;
      const path = defaultSearchPath(role);
      navigate(`${path}?search=${encodeURIComponent(trimmed)}`);
      onSearch?.(trimmed);
    },
    [navigate, onSearch, role]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && flat[activeIndex]) {
      navigateToTarget(flat[activeIndex]);
    } else {
      submitFreeText(query);
    }
  };

  const handleKeyDown = (e) => {
    if (!open || !flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const placeholder =
    role === "FREELANCER"
      ? "Search jobs, clients, gigs…"
      : role === "CLIENT"
      ? "Search editors, gigs…"
      : "Search editors, gigs, services…";

  const totalCount = flat.length;

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center transition-all duration-300 ${
            isFocused ? "w-72" : "w-56"
          }`}
        >
          <div
            className={`absolute inset-0 border-2 rounded-full transition-all duration-300 ${
              isFocused
                ? "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-white"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              if (e.target.value.trim().length >= MIN_CHARS) setOpen(true);
              else setOpen(false);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (query.trim().length >= MIN_CHARS) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="relative w-full h-10 pl-12 pr-10 bg-transparent rounded-full outline-none text-sm text-gray-800"
            aria-label="Search"
            autoComplete="off"
          />
          <div className="absolute left-0 top-0 flex items-center justify-center w-12 h-10 text-gray-500 pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            ) : (
              <Search className={`w-5 h-5 ${isFocused ? "text-purple-600" : ""}`} />
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-0 flex items-center justify-center w-8 h-10 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {open && isFocused && query.trim().length >= MIN_CHARS && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 max-h-[28rem] overflow-y-auto">
          {loading && totalCount === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
              Searching…
            </div>
          ) : totalCount === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No matches for &quot;{query.trim()}&quot;
              <button
                type="button"
                onClick={() => submitFreeText(query)}
                className="block mx-auto mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                Search all results →
              </button>
            </div>
          ) : (
            <>
              {results.gigs.length > 0 && (
                <Group label="Gigs" icon={<Layers className="w-3 h-3" />}>
                  {results.gigs.map((g, i) => {
                    const idx = i;
                    return (
                      <Row
                        key={`gig-${g.id}`}
                        active={activeIndex === idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigateToTarget({ kind: "gig", ...g })}
                        leading={
                          g.thumbnailUrl ? (
                            <img
                              src={g.thumbnailUrl}
                              alt={g.title}
                              className="w-9 h-9 rounded-md object-cover"
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-purple-500" />
                          )
                        }
                        title={g.title}
                        subtitle={
                          g.freelancer
                            ? `by ${g.freelancer.firstname || ""} ${g.freelancer.lastname || ""}`.trim()
                            : null
                        }
                      />
                    );
                  })}
                </Group>
              )}
              {results.freelancers.length > 0 && (
                <Group label="Editors" icon={<Users className="w-3 h-3" />}>
                  {results.freelancers.map((f, i) => {
                    const idx = results.gigs.length + i;
                    const name = `${f.firstname || ""} ${f.lastname || ""}`.trim();
                    return (
                      <Row
                        key={`f-${f.id}`}
                        active={activeIndex === idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigateToTarget({ kind: "freelancer", ...f })}
                        leading={
                          f.profilePicture ? (
                            <img
                              src={f.profilePicture}
                              alt={name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                              {(name || "?").charAt(0).toUpperCase()}
                            </div>
                          )
                        }
                        title={name || `Editor #${f.id}`}
                        subtitle={
                          f.jobTitle ||
                          (f.skills?.length ? f.skills.slice(0, 3).join(" · ") : null)
                        }
                        trailing={
                          f.rating != null ? (
                            <span className="text-[11px] text-amber-600 font-medium">
                              ★ {Number(f.rating).toFixed(1)}
                            </span>
                          ) : null
                        }
                      />
                    );
                  })}
                </Group>
              )}
              {results.jobs.length > 0 && (
                <Group label="Open Jobs" icon={<Briefcase className="w-3 h-3" />}>
                  {results.jobs.map((j, i) => {
                    const idx =
                      results.gigs.length + results.freelancers.length + i;
                    return (
                      <Row
                        key={`j-${j.id}`}
                        active={activeIndex === idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigateToTarget({ kind: "job", ...j })}
                        leading={<Briefcase className="w-5 h-5 text-blue-500" />}
                        title={j.title}
                        subtitle={
                          j.budgetMin != null || j.budgetMax != null
                            ? `$${Number(j.budgetMin || 0).toLocaleString()}–$${Number(
                                j.budgetMax || j.budgetMin || 0
                              ).toLocaleString()}`
                            : null
                        }
                      />
                    );
                  })}
                </Group>
              )}

              <button
                type="button"
                onClick={() => submitFreeText(query)}
                className="w-full mt-1 px-4 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors text-left border-t border-gray-100"
              >
                Show all results for &quot;{query.trim()}&quot; →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

function Group({ label, icon, children }) {
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ leading, title, subtitle, trailing, active, onClick, onMouseEnter }) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        active ? "bg-purple-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex-shrink-0">{leading}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-gray-500 truncate">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="ml-2 flex-shrink-0">{trailing}</div>}
    </button>
  );
}
