import { spawn } from "child_process";
import type { DbRow } from "../types/index.js";

export type ScanResult = {
  status: "CLEAN" | "INFECTED" | "SKIPPED_DEV" | "FAILED";
  details: Record<string, unknown>;
};

function runCommand(command: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", (error) => resolve({ code: 127, output: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

export async function scanMediaAsset(asset: DbRow): Promise<ScanResult> {
  if (String(asset.status) === "PLACEHOLDER") {
    return { status: "SKIPPED_DEV", details: { reason: "development placeholder" } };
  }
  if (process.env.CLAMAV_ENABLED !== "true") {
    return {
      status: "SKIPPED_DEV",
      details: { reason: "CLAMAV_ENABLED is not true", localOnly: process.env.NODE_ENV !== "production" },
    };
  }

  const scanner = process.env.CLAMSCAN_PATH || "clamscan";
  const target = String(asset.originalUrl || asset.originalKey || "");
  if (!target) return { status: "FAILED", details: { reason: "missing media reference" } };
  const result = await runCommand(scanner, ["--no-summary", target]);
  if (result.code === 0) return { status: "CLEAN", details: { scanner, output: result.output.slice(0, 1000) } };
  if (result.code === 1) return { status: "INFECTED", details: { scanner, output: result.output.slice(0, 1000) } };
  return { status: "FAILED", details: { scanner, code: result.code, output: result.output.slice(0, 1000) } };
}
