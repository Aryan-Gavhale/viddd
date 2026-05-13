import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Send, Star } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axios.js";

const ROLE_COPY = {
  client: {
    title: "Rate your editor",
    subtitle: "Help future clients understand the editor's quality, communication, and reliability.",
    criteria: ["Quality", "Communication", "Deadline", "Brief accuracy", "Professionalism"],
    tags: ["On time", "Great storytelling", "Clean edits", "Easy communication", "Needs clearer updates"],
  },
  freelancer: {
    title: "Rate your client",
    subtitle: "Help editors understand how clear, responsive, and professional this client was.",
    criteria: ["Clear brief", "Responsiveness", "Timely approvals", "Professionalism", "Payment trust"],
    tags: ["Clear brief", "Fast feedback", "Respectful", "Scope changed often", "Slow approvals"],
  },
};

export default function ReviewPage() {
  const [params] = useSearchParams();
  const scopeType = (params.get("scopeType") || "ORDER").toUpperCase();
  const scopeId = params.get("scopeId");
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(Boolean(scopeId));
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState({});
  const [tags, setTags] = useState([]);
  const [publicComment, setPublicComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [wouldWorkAgain, setWouldWorkAgain] = useState(true);

  useEffect(() => {
    if (!scopeId) return;
    let alive = true;
    setLoading(true);
    axiosInstance
      .get(`/reviews/closeout/${scopeType}/${scopeId}`)
      .then((res) => {
        if (alive) setState(res.data?.data || null);
      })
      .catch((error) => toast.error(error?.response?.data?.message || "Could not load review context"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scopeId, scopeType]);

  const role = state?.role || "client";
  const copy = ROLE_COPY[role] || ROLE_COPY.client;

  useEffect(() => {
    setCriteriaRatings(Object.fromEntries(copy.criteria.map((item) => [item, 5])));
  }, [copy]);

  const backTo = useMemo(() => {
    if (!scopeId) return "/";
    // ORDER scope opens at `/orders/:orderId` (registered in App.jsx) and JOB
    // scope opens at `/workspace?jobId=...` (the WorkspaceShell route). The
    // older `/orders/:id/workspace` and `/workspace/projects/:id` paths were
    // never registered as routes, which made the "Back to delivery" link 404
    // for both roles. Use the same patterns as NavbarAuth notifications.
    return scopeType === "ORDER" ? `/orders/${scopeId}` : `/workspace?jobId=${scopeId}`;
  }, [scopeId, scopeType]);

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      toast.error("Choose a star rating first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(`/reviews/closeout/${scopeType}/${scopeId}`, {
        rating,
        criteriaRatings,
        tags,
        publicComment,
        privateNote,
        wouldWorkAgain,
      });
      setState(res.data?.data || null);
      toast.success("Review submitted");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!scopeId) {
    return (
      <PageShell>
        <EmptyState
          title="Open reviews from a completed delivery"
          copy="Reviews are now tied to a completed job or gig order so feedback is accurate and contextual."
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
      </PageShell>
    );
  }

  if (state?.myReview) {
    return (
      <PageShell>
        <BackLink to={backTo} />
        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Review submitted</h1>
          <p className="mt-2 text-gray-600">Your feedback is saved for this delivery.</p>
          <StarRow value={state.myReview.rating} onChange={() => {}} readOnly />
          {state.myReview.publicComment && (
            <p className="mt-4 rounded-2xl bg-white p-4 text-gray-700">{state.myReview.publicComment}</p>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BackLink to={backTo} />
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Post-delivery feedback</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">{copy.subtitle}</p>
        {!state?.eligible && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Reviews unlock after final delivery is completed.
          </div>
        )}
        {state?.eligible && (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Overall rating</label>
              <StarRow value={rating} onChange={setRating} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {copy.criteria.map((item) => (
                <label key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm">
                  <span className="flex-1 font-medium text-gray-700">{item}</span>
                  <select
                    value={criteriaRatings[item] || 5}
                    onChange={(event) => setCriteriaRatings((prev) => ({ ...prev, [item]: Number(event.target.value) }))}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1"
                  >
                    {[5, 4, 3, 2, 1].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {copy.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${tags.includes(tag) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea value={publicComment} onChange={(event) => setPublicComment(event.target.value)} rows={4} placeholder="Public feedback..." className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
            <textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} rows={3} placeholder="Private note for platform/admin, optional..." className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={wouldWorkAgain} onChange={(event) => setWouldWorkAgain(event.target.checked)} />
              I would work with this person again
            </label>
            <button type="submit" disabled={submitting || !rating} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit review
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  );
}

function BackLink({ to }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
      <ArrowLeft className="h-4 w-4" />
      Back to delivery
    </Link>
  );
}

function EmptyState({ title, copy }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{copy}</p>
    </div>
  );
}

function StarRow({ value, onChange, readOnly = false }) {
  return (
    <div className="mt-3 flex gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(score)}
          className={value >= score ? "text-amber-400" : "text-gray-300"}
        >
          <Star className="h-8 w-8" fill={value >= score ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}
