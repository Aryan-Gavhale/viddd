import { spawn } from "child_process";
import type { DbRow } from "../types/index.js";

type ProcessResult = {
  posterKey?: string | null;
  previewKey?: string | null;
  watermarkedKey?: string | null;
  variants: Array<{ id: string; label: string; key: string | null; ready: boolean; kind: string }>;
  metadata: Record<string, unknown>;
};

function isPlaceholder(asset: DbRow): boolean {
  const ref = String(asset.originalUrl || asset.originalKey || "");
  return String(asset.status) === "PLACEHOLDER" || ref.startsWith("dev-placeholder");
}

function deriveKey(asset: DbRow, suffix: string): string | null {
  const base = String(asset.originalKey || asset.originalUrl || "");
  if (!base || base.startsWith("dev-placeholder")) return null;
  const withoutExt = base.replace(/\.[^.]+$/, "");
  return `${withoutExt}.${suffix}`;
}

function runFFmpeg(args: string[]): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", (error) => resolve({ ok: false, output: error.message }));
    child.on("close", (code) => resolve({ ok: code === 0, output: output.slice(0, 2000) }));
  });
}

export async function processMediaAsset(asset: DbRow): Promise<ProcessResult> {
  const posterKey = deriveKey(asset, "poster.jpg");
  const previewKey = deriveKey(asset, "preview.mp4");
  const watermarkedKey = deriveKey(asset, "watermarked.mp4");
  const originalKey = asset.originalKey || asset.originalUrl || null;
  const variants = [
    { id: "original", label: "Original", key: originalKey ? String(originalKey) : null, ready: true, kind: "original" },
    { id: "1080p", label: "1080p", key: previewKey, ready: Boolean(previewKey), kind: "proxy" },
    { id: "720p", label: "720p", key: previewKey, ready: Boolean(previewKey), kind: "proxy" },
    { id: "mobile", label: "Mobile", key: previewKey, ready: Boolean(previewKey), kind: "proxy" },
  ];

  if (isPlaceholder(asset)) {
    return {
      posterKey: null,
      previewKey: null,
      watermarkedKey: null,
      variants: variants.map((variant) => ({ ...variant, ready: false })),
      metadata: { placeholder: true, processingMode: "skipped" },
    };
  }

  if (process.env.MEDIA_PROCESSING_ENABLED !== "true") {
    return {
      posterKey,
      previewKey: String(originalKey || ""),
      watermarkedKey: String(originalKey || ""),
      variants,
      metadata: { processingMode: "metadata_only", reason: "MEDIA_PROCESSING_ENABLED is not true" },
    };
  }

  const source = String(asset.originalUrl || asset.originalKey || "");
  const probe = await runFFmpeg(["-hide_banner", "-i", source, "-f", "null", "-"]);
  return {
    posterKey,
    previewKey: String(originalKey || ""),
    watermarkedKey: String(originalKey || ""),
    variants,
    metadata: { processingMode: "ffmpeg_probe", ffmpegOk: probe.ok, ffmpegOutput: probe.output },
  };
}
