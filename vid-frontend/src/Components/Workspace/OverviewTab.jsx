import {
  Briefcase,
  CheckCircle2,
  FileText,
  MessageSquare,
  Star,
  Tag,
  PackageCheck,
  Film,
  Subtitles,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Avatar } from "./Avatar.jsx";
import {
  fullName,
  formatDate,
  formatCurrency,
  formatRelativeTime,
} from "./utils.js";

export function OverviewTab({ summary, role, scopeKind = "JOB" }) {
  const isOrder = scopeKind === "ORDER";
  const entity = (isOrder ? summary?.order : summary?.job) || summary?.job || {};
  const peer = summary?.peer;
  const counts = summary?.counts || {};
  const recent = summary?.recentMessages || [];

  return (
    <div className="p-6 space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PeerCard peer={peer} role={role} isOrder={isOrder} />
        {isOrder ? (
          <OrderSummaryCard counts={counts} order={entity} />
        ) : (
          <SummaryCard counts={counts} job={entity} />
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            {isOrder ? "Order Brief" : "Project Brief"}
          </h2>
        </div>
        {entity.description || entity.requirements ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {entity.description || entity.requirements}
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            {isOrder
              ? "No additional requirements were captured at checkout."
              : "No project description provided."}
          </p>
        )}

        {!isOrder && Array.isArray(entity.requiredSkills) && entity.requiredSkills.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                Required Skills
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {entity.requiredSkills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {isOrder ? <OrderKeyFacts order={entity} /> : <KeyFacts job={entity} />}
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            Recent Conversation
          </h2>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No messages yet — start the conversation in the chat panel.
          </p>
        ) : (
          <ul className="space-y-3">
            {recent.slice(-5).reverse().map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                <Avatar user={m.sender} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {fullName(m.sender)}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formatRelativeTime(m.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {m.content || <em>attachment</em>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PeerCard({ peer, role, isOrder }) {
  if (!peer) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        {role === "client"
          ? isOrder
            ? "No editor assigned yet."
            : "No freelancer hired yet."
          : "Waiting for client information."}
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 lg:col-span-2">
      <div className="flex items-start gap-4">
        <Avatar user={peer} size={64} />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {fullName(peer)}
          </h3>
          {peer.jobTitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{peer.jobTitle}</p>
          )}
          {peer.kind === "freelancer" && (
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-gray-600 dark:text-gray-400">
              {peer.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {Number(peer.rating).toFixed(1)}
                </span>
              )}
              {peer.hourlyRate != null && (
                <span>{formatCurrency(peer.hourlyRate)}/hr</span>
              )}
            </div>
          )}
          {peer.kind === "client" && peer.company && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{peer.company}</p>
          )}
        </div>
      </div>

      {Array.isArray(peer.skills) && peer.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {peer.skills.slice(0, 8).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ counts, job }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200 mb-3">
        At a glance
      </h3>
      <ul className="space-y-2 text-sm">
        <SummaryRow icon={CheckCircle2} label="Milestones">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.milestonesDone || 0}
          </span>
          <span className="text-gray-500"> / {counts.milestones || 0}</span>
        </SummaryRow>
        <SummaryRow icon={FileText} label="Files">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.files || 0}
          </span>
        </SummaryRow>
        <SummaryRow icon={MessageSquare} label="Unread messages">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.messages || 0}
          </span>
        </SummaryRow>
        <SummaryRow icon={Briefcase} label="Posted">
          <span className="text-gray-700 dark:text-gray-200">{formatDate(job.createdAt)}</span>
        </SummaryRow>
      </ul>
    </div>
  );
}

function OrderSummaryCard({ counts, order }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200 mb-3">
        At a glance
      </h3>
      <ul className="space-y-2 text-sm">
        <SummaryRow icon={RefreshCw} label="Revisions">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.milestonesDone || 0}
          </span>
          <span className="text-gray-500"> / {counts.milestones || 0} requested</span>
        </SummaryRow>
        <SummaryRow icon={FileText} label="Files">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.files || 0}
          </span>
        </SummaryRow>
        <SummaryRow icon={MessageSquare} label="Unread messages">
          <span className="font-semibold text-gray-900 dark:text-white">
            {counts.messages || 0}
          </span>
        </SummaryRow>
        <SummaryRow icon={Briefcase} label="Ordered">
          <span className="text-gray-700 dark:text-gray-200">{formatDate(order.createdAt)}</span>
        </SummaryRow>
      </ul>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, children }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span>{children}</span>
    </li>
  );
}

function KeyFacts({ job }) {
  const items = [];
  if (job.budgetMin || job.budgetMax) {
    items.push({
      label: "Budget",
      value:
        job.budgetMin && job.budgetMax
          ? `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}`
          : formatCurrency(job.budgetMax || job.budgetMin),
    });
  }
  if (job.deadline) items.push({ label: "Deadline", value: formatDate(job.deadline) });
  if (job.projectLength) items.push({ label: "Length", value: String(job.projectLength) });
  if (job.location) items.push({ label: "Location", value: job.location });
  if (Array.isArray(job.category) && job.category.length)
    items.push({ label: "Category", value: job.category.join(", ") });

  if (items.length === 0) return null;

  return (
    <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
            {it.label}
          </dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OrderKeyFacts({ order }) {
  const items = [];
  if (order.package) items.push({ icon: PackageCheck, label: "Package", value: String(order.package) });
  if (order.totalPrice != null)
    items.push({ icon: PackageCheck, label: "Paid", value: formatCurrency(order.totalPrice, order.currency) });
  if (order.deliveryDeadline)
    items.push({ icon: PackageCheck, label: "Due", value: formatDate(order.deliveryDeadline) });
  if (order.aspectRatio) items.push({ icon: Film, label: "Aspect ratio", value: order.aspectRatio });
  if (order.videoType) items.push({ icon: Film, label: "Video type", value: order.videoType });
  if (order.numberOfVideos)
    items.push({ icon: Film, label: "Videos", value: String(order.numberOfVideos) });
  if (order.totalDuration)
    items.push({ icon: Film, label: "Total duration", value: `${order.totalDuration} min` });
  if (order.addSubtitles)
    items.push({ icon: Subtitles, label: "Subtitles", value: "Included" });
  if (order.expressDelivery)
    items.push({ icon: Zap, label: "Express delivery", value: "Yes" });

  if (items.length === 0) return null;

  return (
    <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold inline-flex items-center gap-1">
            {it.icon ? <it.icon className="w-3 h-3" /> : null}
            {it.label}
          </dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
