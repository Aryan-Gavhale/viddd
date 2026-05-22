import { useEffect, useState } from "react";
import { Video, Lock, Loader2, Save, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { fetchPreferences, updatePreferences } from "../../services/settingsApi";

const FORMATS = ["mp4", "mov", "webm", "mkv"];
const RESOLUTIONS = ["480p", "720p", "1080p", "1440p", "4k"];
const POSITIONS = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "center", label: "Center" },
];
const SCOPES = [
  { value: "public", label: "Public — anyone can view" },
  { value: "unlisted", label: "Unlisted — only people with the link" },
  { value: "private", label: "Private — password required" },
];

export function VideoSettings() {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPreferences();
        if (active && data) setVideo(data.video || {});
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load video settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const set = (k, v) => setVideo((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await updatePreferences({ video });
      setVideo(res?.video || video);
      toast.success("Video preferences saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !video) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Video Tools</h2>
          <p className="text-violet-600 dark:text-violet-400 text-sm">Defaults for uploads, watermarks and visibility</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="p-6 space-y-8">
        <Section title="Upload defaults" icon={<Video className="h-4 w-4 text-violet-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Default format">
              <select
                value={video.defaultVideoFormat || "mp4"}
                onChange={(e) => set("defaultVideoFormat", e.target.value)}
                className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default resolution">
              <select
                value={video.defaultResolution || "1080p"}
                onChange={(e) => set("defaultResolution", e.target.value)}
                className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Watermark">
          <Toggle
            title="Apply watermark to deliverables"
            desc="Protect review cuts before clients approve them"
            checked={video.watermarkEnabled !== false}
            onChange={(e) => set("watermarkEnabled", e.target.checked)}
          />
          {video.watermarkEnabled !== false && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Watermark image URL">
                <input
                  type="url"
                  value={video.watermarkImageUrl || ""}
                  onChange={(e) => set("watermarkImageUrl", e.target.value)}
                  placeholder="https://…/watermark.png"
                  className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Position">
                <select
                  value={video.watermarkPosition || "bottom-right"}
                  onChange={(e) => set("watermarkPosition", e.target.value)}
                  className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Opacity (${video.watermarkOpacity ?? 50}%)`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={video.watermarkOpacity ?? 50}
                  onChange={(e) => set("watermarkOpacity", Number(e.target.value))}
                  className="w-full"
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Public videos" icon={<Eye className="h-4 w-4 text-violet-500" />}>
          <Field label="Default scope">
            <select
              value={video.publicVideosScope || "public"}
              onChange={(e) => set("publicVideosScope", e.target.value)}
              className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {video.publicVideosScope === "private" && (
            <Field label="Private password" icon={<Lock className="h-4 w-4 text-violet-500" />}>
              <input
                type="password"
                value={video.privateVideoPassword || ""}
                onChange={(e) => set("privateVideoPassword", e.target.value)}
                className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
              />
            </Field>
          )}
        </Section>

        <Section title="Playback defaults">
          <Toggle
            title="Autoplay portfolio videos"
            desc="Start videos automatically on hover in your portfolio"
            checked={!!video.autoplayPortfolioVideos}
            onChange={(e) => set("autoplayPortfolioVideos", e.target.checked)}
          />
          <Toggle
            title="Loop videos"
            desc="Restart videos when they finish"
            checked={!!video.loopVideos}
            onChange={(e) => set("loopVideos", e.target.checked)}
          />
          <Toggle
            title="Show video controls"
            desc="Display the standard video controls on portfolio videos"
            checked={video.showVideoControls !== false}
            onChange={(e) => set("showVideoControls", e.target.checked)}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {icon}
        <span className={icon ? "ml-2" : ""}>{title}</span>
      </h3>
      {children}
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
        {icon}
        <span className={icon ? "ml-2" : ""}>{label}</span>
      </label>
      {children}
    </div>
  );
}

function Toggle({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
      <div>
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" checked={!!checked} onChange={onChange} className="peer sr-only" />
        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
      </label>
    </div>
  );
}
