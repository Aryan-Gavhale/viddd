import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileVideo,
  HelpCircle,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCcw,
  Receipt,
  ShieldCheck,
  Star,
  Trophy,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import { formatRelativeTime } from "./utils.js";

const STATUS_STYLE = {
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  CHANGES_REQUESTED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  FINAL_DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  AUTO_APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  DISPUTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

const CLOSED_STATUSES = new Set(["FINAL_DELIVERED", "AUTO_APPROVED", "DISPUTED"]);

function isStorageCredentialsError(error) {
  const message = `${error?.response?.data?.message || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("could not load credentials") ||
    message.includes("credential") ||
    message.includes("s3 bucket is not configured") ||
    message.includes("aws")
  );
}

function devPlaceholderKey(scopeType, scopeId, file, kind) {
  return `dev-placeholder/${scopeType.toLowerCase()}/${scopeId}/${kind}/${Date.now()}-${encodeURIComponent(file.name)}`;
}

function allowDevPlaceholderUploads() {
  return import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_PLACEHOLDER_UPLOADS === "true";
}

export function DeliveryPanel({
  scopeType,
  scopeId,
  role: fallbackRole,
  availableFiles = [],
  dark = false,
  onChanged,
}) {
  const [state, setState] = useState(null);
  const [reviewState, setReviewState] = useState(null);
  const [files, setFiles] = useState(availableFiles);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKind, setUploadingKind] = useState(null);
  const [selectedMasterFiles, setSelectedMasterFiles] = useState([]);
  const [masterNotes, setMasterNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [sourceIncluded, setSourceIncluded] = useState(false);

  const isOrder = scopeType === "ORDER";

  const load = useCallback(async () => {
    if (!scopeType || !scopeId) return;
    setLoading(true);
    try {
      const [deliveryRes, reviewRes] = await Promise.all([
        axiosInstance.get(`/deliveries/${scopeType}/${scopeId}`),
        axiosInstance.get(`/reviews/closeout/${scopeType}/${scopeId}`).catch(() => null),
      ]);
      setState(deliveryRes.data?.data || null);
      setReviewState(reviewRes?.data?.data || null);
      if (isOrder) {
        const folders = ["/final-master"];
        const fileResponses = await Promise.all(
          folders.map((folder) =>
            axiosInstance.get(`/project-files/${scopeId}/list`, { params: { folder } }).catch(() => null)
          )
        );
        const orderFiles = fileResponses.flatMap((res) => res?.data?.data?.files || []);
        setFiles(orderFiles);
      } else {
        setFiles(availableFiles || []);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load final delivery");
    } finally {
      setLoading(false);
    }
  }, [availableFiles, isOrder, scopeId, scopeType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isOrder) setFiles(availableFiles || []);
  }, [availableFiles, isOrder]);

  const latest = state?.latest || null;
  const role = state?.role || fallbackRole;
  const isEditor = role === "freelancer" || role === "admin";
  const isClient = role === "client" || role === "admin";
  const isClosed = latest ? CLOSED_STATUSES.has(latest.status) : false;
  const canDeliverMaster = isEditor && latest?.status === "APPROVED";
  const reviewDue = latest?.reviewDueAt ? new Date(latest.reviewDueAt) : null;
  const masterFiles = useMemo(
    () => files.filter((file) => {
      const bucket = String(file.category || file.folder || "").toLowerCase();
      return ["final", "/final-master"].includes(bucket);
    }),
    [files]
  );
  const selectedMasterBlocked = selectedMasterFiles.some((id) => {
    const file = masterFiles.find((item) => Number(item.id) === Number(id));
    return file && !isMediaReadyForDelivery(file);
  });

  const submitCloseoutReview = async (payload) => {
    setReviewSubmitting(true);
    try {
      const res = await axiosInstance.post(`/reviews/closeout/${scopeType}/${scopeId}`, payload);
      setReviewState(res.data?.data || null);
      toast.success("Review submitted");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const toggleId = (id, selected, setSelected) => {
    const numericId = Number(id);
    setSelected((prev) =>
      prev.includes(numericId) ? prev.filter((item) => item !== numericId) : [...prev, numericId]
    );
  };

  const recordUploadedFile = async (file, kind) => {
    if (isOrder) {
      const folder = kind === "master" ? "/final-master" : "/review-cuts";
      let fileKey = null;
      let usedDevPlaceholder = false;
      try {
        const presign = await axiosInstance.post("/project-files/presign", {
          orderId: Number(scopeId),
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          folder,
        });
        const upload = presign.data?.data || {};
        fileKey = upload.fileKey;
        if (!upload.uploadUrl || !fileKey) throw new Error("Could not create upload URL");
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": upload.headers?.["Content-Type"] || file.type || "application/octet-stream" },
          credentials: "omit",
        });
        if (!put.ok) throw new Error("File upload failed");
      } catch (uploadError) {
        if (!isStorageCredentialsError(uploadError)) throw uploadError;
        if (!allowDevPlaceholderUploads()) throw uploadError;
        usedDevPlaceholder = true;
        fileKey = devPlaceholderKey(scopeType, scopeId, file, kind);
      }
      const created = await axiosInstance.post("/project-files/upload", {
        orderId: Number(scopeId),
        fileName: file.name,
        fileKey,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        folder,
        tags: [kind],
      });
      return { ...created.data?.data?.file, isDevPlaceholder: usedDevPlaceholder };
    }

    let url = null;
    let usedDevPlaceholder = false;
    try {
      const initRes = await axiosInstance.post("/files/initiate-upload", {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        jobId: Number(scopeId),
      });
      const { uploadId, key, maxPartSize } = initRes.data.data;
      const totalParts = Math.max(1, Math.ceil(file.size / maxPartSize));
      const parts = [];
      for (let i = 0; i < totalParts; i += 1) {
        const start = i * maxPartSize;
        const end = Math.min(file.size, start + maxPartSize);
        const partRes = await axiosInstance.post("/files/upload-part-url", {
          key,
          uploadId,
          partNumber: i + 1,
        });
        const put = await fetch(partRes.data.data.url, { method: "PUT", body: file.slice(start, end) });
        if (!put.ok) throw new Error(`Part ${i + 1} upload failed`);
        const etag = put.headers.get("ETag") || put.headers.get("etag");
        if (!etag) throw new Error("Missing upload ETag");
        parts.push({ PartNumber: i + 1, ETag: etag.replace(/"/g, "") });
      }
      const completeRes = await axiosInstance.post("/files/complete-upload", { key, uploadId, parts });
      url = completeRes.data.data?.url || key;
    } catch (uploadError) {
      if (!isStorageCredentialsError(uploadError)) throw uploadError;
      if (!allowDevPlaceholderUploads()) throw uploadError;
      usedDevPlaceholder = true;
      url = devPlaceholderKey(scopeType, scopeId, file, kind);
    }
    const created = await axiosInstance.post(`/workspace/projects/${scopeId}/files`, {
      fileName: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      category: kind === "master" ? "final" : "deliverable",
      note: kind === "master" ? "Full-resolution final master" : "Watermarked review cut",
    });
    return { ...created.data?.data, isDevPlaceholder: usedDevPlaceholder };
  };

  const handleUpload = async (event, kind) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type?.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }
    setUploadingKind(kind);
    try {
      const uploaded = await recordUploadedFile(file, kind);
      if (uploaded?.id) {
        setFiles((prev) => [uploaded, ...prev]);
        setSelectedMasterFiles((prev) => [...new Set([Number(uploaded.id), ...prev])]);
      }
      toast.success(
        uploaded?.isDevPlaceholder
          ? "Workflow test master added — no real video stored. Use only for exercising the final delivery flow."
          : "Final master uploaded"
      );
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Upload failed");
    } finally {
      setUploadingKind(null);
    }
  };

  const deliverMaster = async (event) => {
    event.preventDefault();
    if (!latest?.id || selectedMasterFiles.length === 0) return;
    setSubmitting(true);
    try {
      await axiosInstance.post(`/deliveries/${latest.id}/deliver-master`, {
        masterFileIds: selectedMasterFiles,
        releaseNotes: masterNotes,
        sourceIncluded,
      });
      toast.success("Final master delivered. Client can now download it.");
      setMasterNotes("");
      setSelectedMasterFiles([]);
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not deliver final master");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={panelClass(dark, "flex min-h-80 items-center justify-center")}>
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={dark ? "space-y-5 text-slate-100" : "space-y-5 p-6"}>
      <section className={panelClass(dark, "p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PackageCheck className={dark ? "h-5 w-5 text-purple-300" : "h-5 w-5 text-indigo-600"} />
              <h2 className={dark ? "text-xl font-bold text-white" : "text-xl font-bold text-gray-900 dark:text-white"}>
                Final Delivery
              </h2>
              <DeliveryBadge status={latest?.status || "WORKING"} dark={dark} />
            </div>
            <p className={dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-gray-500 dark:text-gray-400"}>
              Final delivery unlocks only after the client approves a review cut in Files. Then the editor uploads the downloadable full-resolution master here.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className={buttonClass(dark, "secondary")}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {latest && (
          <div className={dark ? "mt-5 grid gap-3 md:grid-cols-3" : "mt-5 grid gap-3 md:grid-cols-3"}>
            <MiniStat dark={dark} icon={FileVideo} label="Review version" value={`v${latest.version}`} />
            <MiniStat dark={dark} icon={Clock} label="Client review due" value={reviewDue ? reviewDue.toLocaleDateString() : "Not set"} />
            <MiniStat dark={dark} icon={ShieldCheck} label="Source files" value={latest.sourceIncluded ? "Included" : "Not included"} />
          </div>
        )}
      </section>

      {!isClosed && latest?.status !== "APPROVED" && (
        <LockedDeliveryState status={latest?.status} isClient={isClient} dark={dark} />
      )}

      {canDeliverMaster && (
        <form onSubmit={deliverMaster} className={panelClass(dark, "p-5 space-y-4")}>
          <div>
            <h3 className={dark ? "font-semibold text-white" : "font-semibold text-gray-900 dark:text-white"}>2. Deliver full-resolution final master</h3>
            <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>
              The client approved the preview. Upload the max-resolution, non-watermarked final file here. This file becomes downloadable for the client.
            </p>
          </div>

          <label className={buttonClass(dark, "success")}>
            {uploadingKind === "master" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload final master
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={!!uploadingKind}
              onChange={(event) => handleUpload(event, "master")}
            />
          </label>

          {masterFiles.length > 0 && (
            <div>
              <p className={labelClass(dark)}>Downloadable final masters</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {masterFiles.map((file) => (
                  <label key={file.id} className={`${checkboxClass(dark)} ${!isMediaReadyForDelivery(file) ? "opacity-60" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selectedMasterFiles.includes(Number(file.id))}
                      disabled={!isMediaReadyForDelivery(file)}
                      onChange={() => toggleId(file.id, selectedMasterFiles, setSelectedMasterFiles)}
                    />
                    <span className="truncate">{file.fileName}</span>
                    {file.media?.status && (
                      <span className="text-xs opacity-70 capitalize">{mediaStatusLabel(file.media.status)}</span>
                    )}
                    <span className="ml-auto text-xs opacity-70">v{file.version || 1}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={masterNotes}
            onChange={(event) => setMasterNotes(event.target.value)}
            rows={3}
            placeholder="Final master notes: resolution, codec, frame rate, included source files..."
            className={inputClass(dark)}
          />

          <button
            type="submit"
            disabled={submitting || selectedMasterFiles.length === 0 || selectedMasterBlocked}
            className={buttonClass(dark, "success")}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Deliver final master and close
          </button>
        </form>
      )}

      {isClosed && (
        isClient ? (
          <ClientFinalDeliveryHub
            delivery={latest}
            files={files}
            isOrder={isOrder}
            scopeType={scopeType}
            scopeId={scopeId}
            reviewState={reviewState}
            dark={dark}
            submitting={reviewSubmitting}
            onSubmitReview={submitCloseoutReview}
          />
        ) : (
          <EditorFinalDeliveryHub
            delivery={latest}
            files={files}
            isOrder={isOrder}
            scope={state?.scope}
            scopeType={scopeType}
            scopeId={scopeId}
            reviewState={reviewState}
            dark={dark}
            submitting={reviewSubmitting}
            onSubmitReview={submitCloseoutReview}
          />
        )
      )}

      <section className={panelClass(dark, "p-5")}>
        <h3 className={dark ? "font-semibold text-white" : "font-semibold text-gray-900 dark:text-white"}>Delivery timeline</h3>
        <div className="mt-4 space-y-3">
          {state?.history?.length ? (
            state.history.map((item) => <TimelineItem key={item.id} delivery={item} dark={dark} />)
          ) : (
            <p className={dark ? "text-sm text-slate-400" : "text-sm text-gray-500 dark:text-gray-400"}>
              No final delivery submitted yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function DeliveryBadge({ status, dark }) {
  const label = status === "WORKING" ? "Working" : status.replaceAll("_", " ").toLowerCase();
  const classes =
    status === "WORKING"
      ? dark
        ? "border-slate-700 bg-slate-800 text-slate-300"
        : "border-gray-200 bg-gray-100 text-gray-600"
      : STATUS_STYLE[status] || STATUS_STYLE.SUBMITTED;
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes}`}>{label}</span>;
}

function getFilesByIds(files, ids = []) {
  const wanted = new Set((ids || []).map((id) => Number(id)));
  return files.filter((file) => wanted.has(Number(file.id)));
}

function LockedDeliveryState({ status, isClient, dark }) {
  const copy =
    status === "SUBMITTED"
      ? isClient
        ? "Review the protected cut in Files. Approving it will unlock final delivery for the editor."
        : "The client is reviewing the cut in Files. Final master upload unlocks after approval."
      : status === "CHANGES_REQUESTED"
        ? "Changes were requested. Upload a new review cut in Files and send it for approval again."
        : "Upload and send a review cut from Files first. Delivery opens only after the client approves that review cut.";
  return (
    <section className={panelClass(dark, "p-5")}>
      <div className="flex items-start gap-3">
        <ShieldCheck className={dark ? "mt-0.5 h-5 w-5 text-amber-300" : "mt-0.5 h-5 w-5 text-amber-600"} />
        <div>
          <h3 className={dark ? "font-semibold text-white" : "font-semibold text-gray-900 dark:text-white"}>Waiting for review approval</h3>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>
            {copy}
          </p>
        </div>
      </div>
    </section>
  );
}

function ClientFinalDeliveryHub({
  delivery,
  files,
  isOrder,
  scopeType,
  scopeId,
  reviewState,
  dark,
  submitting,
  onSubmitReview,
}) {
  const masterFiles = getFilesByIds(files, delivery?.masterFileIds?.length ? delivery.masterFileIds : delivery?.finalFileIds);
  const peerName = reviewState?.peer?.name || "your editor";
  return (
    <section className={dark ? "space-y-5" : "space-y-5"}>
      <div className={dark ? "overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-950 p-5" : "overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-5 shadow-sm"}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Archive className={dark ? "h-5 w-5 text-emerald-300" : "h-5 w-5 text-emerald-600"} />
              <h3 className={dark ? "font-semibold text-white" : "font-semibold text-gray-900"}>Client Closeout Hub</h3>
            </div>
            <p className={dark ? "mt-1 max-w-2xl text-sm text-slate-300" : "mt-1 max-w-2xl text-sm text-gray-600"}>
              Your approved final cut is ready. Preview the master, download delivery variants, collect your invoice, rate {peerName}, or open support if anything is wrong.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/invoices?${scopeType === "ORDER" ? "orderId" : "jobId"}=${scopeId}`} className={buttonClass(dark, "secondary")}>
              <Receipt className="h-4 w-4" />
              Invoice
            </a>
            <a href={`/support?${scopeType === "ORDER" ? "orderId" : "jobId"}=${scopeId}&topic=delivery`} className={buttonClass(dark, "secondary")}>
              <HelpCircle className="h-4 w-4" />
              Support
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <CloseoutStep dark={dark} icon={FileVideo} title="Preview" copy="Watch the final master inside Vidlancing." done />
          <CloseoutStep dark={dark} icon={Download} title="Download" copy="Original, HD, mobile, and source package when available." done={masterFiles.length > 0} />
          <CloseoutStep dark={dark} icon={Receipt} title="Invoice" copy="Keep receipt and tax trail for your records." done />
          <CloseoutStep dark={dark} icon={Star} title="Review" copy={`Rate ${peerName} to close the trust loop.`} done={Boolean(reviewState?.myReview)} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div>
          <FinalMasterPlayer files={masterFiles} isOrder={isOrder} dark={dark} />
        </div>
        <div className="space-y-5">
          <DownloadVariantList files={masterFiles} isOrder={isOrder} sourceIncluded={delivery?.sourceIncluded} dark={dark} />
          <MutualReviewCard
            role="client"
            reviewState={reviewState}
            dark={dark}
            submitting={submitting}
            onSubmit={onSubmitReview}
          />
          <CloseoutSupportCard
            dark={dark}
            title="Need help after delivery?"
            copy="If the final file is inaccessible, incorrect, or corrupted, open support with this delivery attached."
            href={`/support?${scopeType === "ORDER" ? "orderId" : "jobId"}=${scopeId}&topic=delivery`}
            cta="Open support"
          />
        </div>
      </div>
    </section>
  );
}

function EditorFinalDeliveryHub({
  delivery,
  files,
  isOrder,
  scope,
  scopeType,
  scopeId,
  reviewState,
  dark,
  submitting,
  onSubmitReview,
}) {
  const masterFiles = getFilesByIds(files, delivery?.masterFileIds?.length ? delivery.masterFileIds : delivery?.finalFileIds);
  const payoutState = getPayoutState(scope, isOrder);
  const deliveredAt = delivery?.masterDeliveredAt || delivery?.updatedAt || delivery?.submittedAt;
  const peerReview = reviewState?.peerReview;
  const archiveHref = `/archive?${scopeType === "ORDER" ? "orderId" : "jobId"}=${scopeId}`;
  return (
    <section className="space-y-5">
      <div className={dark ? "rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900/80 to-slate-950 p-5" : "rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-slate-50 p-5 shadow-sm"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Trophy className={dark ? "mt-0.5 h-6 w-6 text-purple-300" : "mt-0.5 h-6 w-6 text-purple-600"} />
            <div>
              <h3 className={dark ? "font-semibold text-white" : "font-semibold text-gray-900"}>Editor Closeout Hub</h3>
              <p className={dark ? "mt-1 max-w-2xl text-sm text-slate-300" : "mt-1 max-w-2xl text-sm text-gray-600"}>
                Final delivery is sent. This screen keeps your proof of delivery, payout state, client review, and archive record separate from the client download experience.
              </p>
            </div>
          </div>
          <a href={archiveHref} className={buttonClass(dark, "secondary")}>
            <Archive className="h-4 w-4" />
            Archive
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <CloseoutStep dark={dark} icon={ShieldCheck} title="Proof saved" copy="Delivery metadata and master file list are preserved." done />
          <CloseoutStep dark={dark} icon={Receipt} title="Payout state" copy={payoutState.copy} done={payoutState.done} />
          <CloseoutStep dark={dark} icon={Star} title="Client review" copy={peerReview ? "Client feedback received." : "Waiting for client feedback."} done={Boolean(peerReview)} />
          <CloseoutStep dark={dark} icon={Archive} title="Archive" copy="Project is ready for portfolio records and history." done />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <DeliveryProofCard
            dark={dark}
            delivery={delivery}
            files={masterFiles}
            deliveredAt={deliveredAt}
          />
          <ClientFeedbackCard review={peerReview} dark={dark} />
        </div>
        <div className="space-y-5">
          <PayoutStateCard scope={scope} isOrder={isOrder} dark={dark} />
          <MutualReviewCard
            role="freelancer"
            reviewState={reviewState}
            dark={dark}
            submitting={submitting}
            onSubmit={onSubmitReview}
          />
          <CloseoutSupportCard
            dark={dark}
            title="Keep delivery proof"
            copy="Use this archive if a payout, dispute, or client question needs evidence later."
            href={archiveHref}
            cta="Open archive"
          />
        </div>
      </div>
    </section>
  );
}

function DeliveryProofCard({ dark, delivery, files, deliveredAt }) {
  return (
    <div className={dark ? "rounded-3xl border border-slate-800 bg-slate-950/60 p-5" : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={labelClass(dark)}>Delivery proof</p>
          <h4 className={dark ? "mt-1 text-lg font-semibold text-white" : "mt-1 text-lg font-semibold text-gray-900 dark:text-white"}>
            Final master delivered
          </h4>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>
            Delivered {deliveredAt ? new Date(deliveredAt).toLocaleString() : "recently"} · Version {delivery?.version || 1}
          </p>
        </div>
        <DeliveryBadge status={delivery?.status || "FINAL_DELIVERED"} dark={dark} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {files.map((file) => (
          <div key={file.id} className={checkboxClass(dark)}>
            <FileVideo className="h-4 w-4" />
            <span className="truncate">{file.fileName}</span>
            <span className="ml-auto text-xs opacity-70">{formatBytes(file.fileSize || file.size)}</span>
          </div>
        ))}
        {files.length === 0 && <p className={dark ? "text-sm text-slate-400" : "text-sm text-gray-500 dark:text-gray-400"}>No master file metadata found.</p>}
      </div>
      {delivery?.releaseNotes && (
        <div className={dark ? "mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4" : "mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"}>
          <p className={labelClass(dark)}>Release notes sent to client</p>
          <p className={dark ? "mt-2 whitespace-pre-wrap text-sm text-slate-300" : "mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300"}>{delivery.releaseNotes}</p>
        </div>
      )}
    </div>
  );
}

function PayoutStateCard({ scope, isOrder, dark }) {
  const state = getPayoutState(scope, isOrder);
  return (
    <div className={dark ? "rounded-3xl border border-slate-800 bg-slate-950/60 p-5" : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex items-start gap-3">
        <ShieldCheck className={state.done ? "mt-0.5 h-5 w-5 text-emerald-500" : "mt-0.5 h-5 w-5 text-amber-500"} />
        <div>
          <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900 dark:text-white"}>{state.title}</p>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>{state.copy}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <MiniStat dark={dark} icon={Receipt} label="Escrow" value={isOrder ? String(scope?.escrowStatus || "RELEASED") : "Project closed"} />
        <MiniStat dark={dark} icon={ShieldCheck} label="Payout" value={scope?.freelancerPayout ? `₹${Number(scope.freelancerPayout).toFixed(2)}` : "Recorded"} />
      </div>
    </div>
  );
}

function ClientFeedbackCard({ review, dark }) {
  return (
    <div className={dark ? "rounded-3xl border border-slate-800 bg-slate-950/60 p-5" : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex items-start gap-3">
        <Star className={review ? "mt-0.5 h-5 w-5 text-amber-400" : "mt-0.5 h-5 w-5 text-gray-400"} />
        <div>
          <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900 dark:text-white"}>
            {review ? "Client review received" : "Waiting for client review"}
          </p>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>
            {review ? "Feedback from the client is visible below." : "The client can rate the delivery from their closeout hub."}
          </p>
        </div>
      </div>
      {review ? <ReviewSummary review={review} dark={dark} /> : (
        <div className={dark ? "mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400" : "mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"}>
          Client feedback will appear here after they submit it.
        </div>
      )}
    </div>
  );
}

function FinalMasterPlayer({ files, isOrder, dark }) {
  const file = files[0];
  const [src, setSrc] = useState(null);
  const [mediaState, setMediaState] = useState(null);
  const devPlaceholder = isDevPlaceholderFile(file);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setMediaState(null);
    if (!file || devPlaceholder) return undefined;
    axiosInstance
      .get(`/media/assets/${file.id}`)
      .then((res) => {
        if (!alive) return;
        const state = res.data?.data || null;
        setMediaState(state);
        const mediaUrl = state?.urls?.preview?.url || state?.urls?.original?.url;
        if (mediaUrl) setSrc(mediaUrl);
      })
      .catch(() => null);
    if (!isOrder && file.url) {
      setSrc(file.url);
      return undefined;
    }
    createDownloadUrl(file, isOrder).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [file, isOrder, devPlaceholder]);
  const mediaStatus = mediaState?.asset?.status || file?.media?.status;

  return (
    <div className={dark ? "overflow-hidden rounded-3xl border border-slate-800 bg-black" : "overflow-hidden rounded-3xl border border-gray-200 bg-black"}>
      <div className="relative aspect-video">
        {devPlaceholder ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <FileVideo className="h-10 w-10 text-white/60" />
            <p className="mt-3 text-sm font-semibold">Workflow test file</p>
            <p className="mt-1 max-w-md text-xs text-white/60">No video bytes were stored because this environment has no storage credentials.</p>
          </div>
        ) : ["FAILED", "QUARANTINED"].includes(mediaStatus) ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <FileVideo className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-semibold">Final media is blocked</p>
            <p className="mt-1 max-w-md text-xs text-white/60">Upload a new clean final master or retry processing.</p>
          </div>
        ) : src ? (
          <video src={src} controls controlsList="nodownload" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/70">Preparing final preview...</div>
        )}
      </div>
      <div className="flex items-center gap-2 p-3 text-sm text-white/80">
        <FileVideo className="h-4 w-4" />
        <span className="truncate">{file?.fileName || "Final master"}</span>
      </div>
    </div>
  );
}

function DownloadVariantList({ files, isOrder, sourceIncluded, dark }) {
  const masterFile = files[0];
  const [mediaState, setMediaState] = useState(null);
  const fallbackVariants = [
    { id: "original", label: "Original", detail: "Maximum quality master" },
    { id: "1080p", label: "1080p", detail: "HD delivery copy" },
    { id: "720p", label: "720p", detail: "Fast sharing copy" },
    { id: "mobile", label: "Mobile", detail: "Small preview copy" },
  ];

  useEffect(() => {
    let alive = true;
    setMediaState(null);
    if (!masterFile?.id) return undefined;
    axiosInstance
      .get(`/media/assets/${masterFile.id}`)
      .then((res) => {
        if (alive) setMediaState(res.data?.data || null);
      })
      .catch(() => {
        if (alive) setMediaState(null);
      });
    return () => {
      alive = false;
    };
  }, [masterFile?.id]);

  const download = async (file, variant) => {
    if (!file) return;
    try {
      const assetId = file.media?.id || mediaState?.asset?.id;
      const url =
        variant?.url ||
        (variant?.id && assetId
          ? (await axiosInstance.get(`/media/assets/${assetId}/urls`, {
              params: { kind: variant.id === "original" ? "original" : "variant", variantId: variant.id },
            })).data?.data?.url
          : await createDownloadUrl(file, isOrder));
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not create download link");
    }
  };

  if (!masterFile) {
    return (
      <div className={dark ? "rounded-2xl border border-amber-800 bg-amber-500/10 p-4 text-sm text-amber-200" : "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"}>
        Final master metadata is not available yet.
      </div>
    );
  }

  const serverVariants = Array.isArray(mediaState?.urls?.variants)
    ? mediaState.urls.variants
        .filter((item) => !item.locked)
        .map((item) => ({ ...item, detail: item.kind === "original" ? "Maximum quality master" : "Processed delivery copy" }))
    : [];
  const variants = serverVariants.length ? serverVariants : fallbackVariants;

  return (
    <div>
      <p className={labelClass(dark)}>Download options</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => download(masterFile, variant)}
            className={checkboxClass(dark)}
          >
            <Download className="h-4 w-4" />
            <span>
              <span className="block font-semibold">{variant.label}</span>
              <span className="block text-xs opacity-70">{variant.detail}</span>
            </span>
          </button>
        ))}
        {sourceIncluded && (
          <button type="button" onClick={() => download(masterFile)} className={checkboxClass(dark)}>
            <Archive className="h-4 w-4" />
            <span>
              <span className="block font-semibold">Source files</span>
              <span className="block text-xs opacity-70">Project/source package included</span>
            </span>
          </button>
        )}
      </div>
      {!serverVariants.length && (
        <p className={dark ? "mt-2 text-xs text-slate-500" : "mt-2 text-xs text-gray-500 dark:text-gray-400"}>
          Download variants appear here as soon as the media pipeline finishes processing.
        </p>
      )}
    </div>
  );
}

function CloseoutStep({ dark, icon: Icon, title, copy, done }) {
  return (
    <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-950/50 p-4" : "rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex items-center gap-2">
        <span className={done ? "rounded-full bg-emerald-500/15 p-1.5 text-emerald-500" : "rounded-full bg-amber-500/15 p-1.5 text-amber-500"}>
          <Icon className="h-4 w-4" />
        </span>
        <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900 dark:text-white"}>{title}</p>
      </div>
      <p className={dark ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-gray-500 dark:text-gray-400"}>{copy}</p>
    </div>
  );
}

function CloseoutSupportCard({ dark, title, copy, href, cta = "Open record" }) {
  return (
    <div className={dark ? "rounded-3xl border border-slate-800 bg-slate-950/60 p-5" : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex items-start gap-3">
        <HelpCircle className={dark ? "mt-0.5 h-5 w-5 text-slate-300" : "mt-0.5 h-5 w-5 text-indigo-600"} />
        <div className="min-w-0 flex-1">
          <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900 dark:text-white"}>{title}</p>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>{copy}</p>
          <a href={href} className={dark ? "mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-300 hover:text-purple-200" : "mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"}>
            {cta}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function CloseoutChecklist({ items, dark }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {items.map((item) => (
        <div key={item} className={dark ? "rounded-2xl border border-slate-800 bg-slate-950/60 p-3" : "rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"}>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className={dark ? "mt-2 text-xs font-semibold text-slate-200" : "mt-2 text-xs font-semibold text-gray-700 dark:text-gray-200"}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function MutualReviewCard({ role, reviewState, dark, submitting, onSubmit }) {
  const [open, setOpen] = useState(false);
  const myReview = reviewState?.myReview;
  const peerReview = reviewState?.peerReview;
  const peerName = reviewState?.peer?.name || (role === "client" ? "editor" : "client");
  return (
    <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-950/60 p-4" : "rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <p className={dark ? "font-semibold text-white" : "font-semibold text-gray-900 dark:text-white"}>
              {role === "client" ? "Rate your editor" : "Rate your client"}
            </p>
          </div>
          <p className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-gray-500 dark:text-gray-400"}>
            {myReview ? "Your review is saved." : `Share clear feedback for ${peerName}.`} {peerReview ? "The other side has also reviewed." : "Waiting for the other side's feedback."}
          </p>
        </div>
        {!myReview && reviewState?.canReview && (
          <button type="button" onClick={() => setOpen((value) => !value)} className={buttonClass(dark, "primary")}>
            <Star className="h-4 w-4" />
            {open ? "Close form" : "Leave review"}
          </button>
        )}
      </div>
      {myReview && <ReviewSummary review={myReview} dark={dark} />}
      {open && !myReview && (
        <CloseoutReviewForm role={role} dark={dark} submitting={submitting} onSubmit={async (payload) => {
          await onSubmit(payload);
          setOpen(false);
        }} />
      )}
    </div>
  );
}

function CloseoutReviewForm({ role, dark, submitting, onSubmit }) {
  const criteria = role === "client"
    ? ["Quality", "Communication", "Deadline", "Brief accuracy", "Professionalism"]
    : ["Clear brief", "Responsiveness", "Timely approvals", "Professionalism", "Payment trust"];
  const quickTags = role === "client"
    ? ["On time", "Great storytelling", "Clean edits", "Easy communication", "Needs clearer updates"]
    : ["Clear brief", "Fast feedback", "Respectful", "Scope changed often", "Slow approvals"];
  const [rating, setRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState(() => Object.fromEntries(criteria.map((item) => [item, 5])));
  const [tags, setTags] = useState([]);
  const [publicComment, setPublicComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [wouldWorkAgain, setWouldWorkAgain] = useState(true);

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!rating) {
      toast.error("Choose a star rating first");
      return;
    }
    onSubmit({ rating, criteriaRatings, tags, publicComment, privateNote, wouldWorkAgain });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <StarPicker value={rating} onChange={setRating} />
      <div className="grid gap-2 md:grid-cols-2">
        {criteria.map((item) => (
          <label key={item} className={checkboxClass(dark)}>
            <span className="flex-1">{item}</span>
            <select
              value={criteriaRatings[item]}
              onChange={(event) => setCriteriaRatings((prev) => ({ ...prev, [item]: Number(event.target.value) }))}
              className={dark ? "rounded-lg border border-slate-700 bg-slate-900 px-2 py-1" : "rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"}
            >
              {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {quickTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={tags.includes(tag) ? buttonClass(dark, "primary") : buttonClass(dark, "secondary")}
          >
            {tag}
          </button>
        ))}
      </div>
      <textarea value={publicComment} onChange={(event) => setPublicComment(event.target.value)} rows={3} placeholder="Public feedback..." className={inputClass(dark)} />
      <textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} rows={2} placeholder="Private note for platform/admin, optional..." className={inputClass(dark)} />
      <label className={checkboxClass(dark)}>
        <input type="checkbox" checked={wouldWorkAgain} onChange={(event) => setWouldWorkAgain(event.target.checked)} />
        I would work with this person again
      </label>
      <button type="submit" disabled={submitting || !rating} className={buttonClass(dark, "success")}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
        Submit review
      </button>
    </form>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={value >= score ? "text-amber-400" : "text-gray-300"}
        >
          <Star className="h-7 w-7" fill={value >= score ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function ReviewSummary({ review, dark }) {
  return (
    <div className={dark ? "mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3" : "mt-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"}>
      <div className="flex items-center gap-1 text-amber-400">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="h-4 w-4" fill={index < Number(review.rating) ? "currentColor" : "none"} />
        ))}
      </div>
      {review.publicComment && <p className={dark ? "mt-2 text-sm text-slate-300" : "mt-2 text-sm text-gray-700 dark:text-gray-300"}>{review.publicComment}</p>}
      {review.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {review.tags.map((tag) => (
            <span key={tag} className={dark ? "rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300" : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

async function createDownloadUrl(file, isOrder) {
  if (!file) return null;
  if (isDevPlaceholderFile(file)) {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(`Development placeholder for ${file.fileName || "final master"}. No video bytes were uploaded.`)}`;
  }
  if (!isOrder && file.url) return file.url;
  const res = await axiosInstance.get(`/project-files/file/${file.id}/download`);
  return res.data?.data?.url;
}

function isDevPlaceholderFile(file) {
  const ref = String(file?.url || file?.fileKey || "");
  return ref.startsWith("dev-placeholder") || ref.startsWith("dev-placeholder://");
}

function isMediaReadyForDelivery(file) {
  const status = file?.media?.status;
  if (!status) return true;
  return ["READY", "PLACEHOLDER"].includes(status);
}

function mediaStatusLabel(status) {
  if (status === "PLACEHOLDER") return "local placeholder";
  return String(status || "").replaceAll("_", " ").toLowerCase();
}

function getPayoutState(scope, isOrder) {
  if (!isOrder) {
    return {
      title: "Project closed",
      copy: "This job is closed and delivery proof is archived.",
      done: true,
    };
  }
  const escrow = String(scope?.escrowStatus || "RELEASED").toUpperCase();
  if (escrow === "RELEASED") {
    return {
      title: "Payout released",
      copy: "Escrow is released and the payout record is attached to this delivery.",
      done: true,
    };
  }
  if (escrow === "DISPUTED") {
    return {
      title: "Payout in dispute",
      copy: "Funds are paused while support reviews the dispute.",
      done: false,
    };
  }
  return {
    title: "Payout pending",
    copy: `Current escrow state: ${escrow.toLowerCase().replaceAll("_", " ")}.`,
    done: false,
  };
}

function formatBytes(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "N/A";
  const v = Number(n);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`;
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function MiniStat({ icon: Icon, label, value, dark }) {
  return (
    <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-950/50 p-3" : "rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50"}>
      <Icon className={dark ? "h-4 w-4 text-purple-300" : "h-4 w-4 text-indigo-600"} />
      <p className={dark ? "mt-2 text-xs text-slate-500" : "mt-2 text-xs text-gray-500 dark:text-gray-400"}>{label}</p>
      <p className={dark ? "font-semibold text-slate-100" : "font-semibold text-gray-900 dark:text-white"}>{value}</p>
    </div>
  );
}

function TimelineItem({ delivery, dark }) {
  return (
    <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-950/50 p-4" : "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/50"}>
      <div className="flex flex-wrap items-center gap-2">
        <DeliveryBadge status={delivery.status} dark={dark} />
        <span className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900 dark:text-white"}>
          Version {delivery.version}
        </span>
        <span className={dark ? "text-xs text-slate-500" : "text-xs text-gray-500 dark:text-gray-400"}>
          {formatRelativeTime(delivery.submittedAt || delivery.createdAt)}
        </span>
      </div>
      {delivery.releaseNotes && (
        <p className={dark ? "mt-3 whitespace-pre-wrap text-sm text-slate-300" : "mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300"}>
          {delivery.releaseNotes}
        </p>
      )}
      {delivery.reviewNote && (
        <div className={dark ? "mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3" : "mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900"}>
          <p className={dark ? "text-xs font-semibold text-slate-400" : "text-xs font-semibold text-gray-500 dark:text-gray-400"}>Client note</p>
          <p className={dark ? "mt-1 text-sm text-slate-200" : "mt-1 text-sm text-gray-700 dark:text-gray-300"}>{delivery.reviewNote}</p>
        </div>
      )}
    </div>
  );
}

function panelClass(dark, extra) {
  const base = dark
    ? "rounded-3xl border border-slate-800 bg-slate-900/60"
    : "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
  return `${base} ${extra}`;
}

function inputClass(dark) {
  return dark
    ? "w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
    : "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white";
}

function labelClass(dark) {
  return dark ? "text-xs font-semibold uppercase tracking-wide text-slate-500" : "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
}

function checkboxClass(dark) {
  return dark
    ? "flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
    : "flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200";
}

function buttonClass(dark, variant) {
  const variants = {
    primary: dark ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: dark ? "border border-slate-800 bg-slate-950 text-slate-200 hover:border-purple-500" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    warning: dark ? "border border-amber-700 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger: dark ? "border border-red-800 bg-red-500/10 text-red-300 hover:bg-red-500/20" : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]}`;
}
