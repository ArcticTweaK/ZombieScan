import chalk from "chalk";
import { ScanReport, ZombieResult, ZombieType } from "./types";

const ZOMBIE_TYPE_COLORS: Record<ZombieType, chalk.Chalk> = {
  "Manual Polyfill": chalk.cyan,
  "Legacy Debugger": chalk.yellow,
  "Orphaned Logic": chalk.magenta,
  "Dead Feature Flag": chalk.red,
  "Redundant Abstraction": chalk.blue,
  "Obsolete Workaround": chalk.green,
  "Vestigial Import": chalk.gray,
  "Zombie Comment Block": chalk.white,
};

const ZOMBIE_EMOJI: Record<ZombieType, string> = {
  "Manual Polyfill": "🔧",
  "Legacy Debugger": "🐛",
  "Orphaned Logic": "👻",
  "Dead Feature Flag": "🚩",
  "Redundant Abstraction": "🪞",
  "Obsolete Workaround": "🦕",
  "Vestigial Import": "📦",
  "Zombie Comment Block": "💬",
};

function confidenceBar(score: number): string {
  const filled = Math.round(score);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  if (score >= 8) return chalk.red(bar);
  if (score >= 5) return chalk.yellow(bar);
  return chalk.green(bar);
}

function confidenceLabel(score: number): string {
  if (score >= 9) return chalk.red.bold("CERTAIN");
  if (score >= 7) return chalk.red("HIGH");
  if (score >= 5) return chalk.yellow("MEDIUM");
  return chalk.green("LOW");
}

export function printBanner(): void {
  console.log(
    chalk.red.bold(`
 ░▒▓███████▓▒░░▒▓██████▓▒░░▒▓██████████████▓▒░░▒▓███████▓▒░░▒▓█▓▒░▒▓████████▓▒░
        ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
        ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
 ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░▒▓██████▓▒░
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
░▒▓████████▓▒░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░▒▓████████▓▒░`)
  );
  console.log(
    chalk.gray("  🧟 AI-Powered Zombie Code Detector  ") +
      chalk.red.dim("[ eliminate the undead ]")
  );
  console.log();
}

export function printZombieResult(zombie: ZombieResult, index: number): void {
  const typeColor =
    ZOMBIE_TYPE_COLORS[zombie.zombieType] ?? chalk.white;
  const emoji = ZOMBIE_EMOJI[zombie.zombieType] ?? "🧟";

  const header = chalk.bgRed.white.bold(` ZOMBIE #${index + 1} `) +
    " " +
    typeColor.bold(`${emoji} ${zombie.zombieType}`);

  console.log(header);
  console.log(
    chalk.gray("  📄 ") +
      chalk.white.underline(zombie.filePath) +
      chalk.gray(` (lines ${zombie.lineStart}–${zombie.lineEnd})`) +
      (zombie.functionName
        ? chalk.gray(` · `) + chalk.cyan(`fn: ${zombie.functionName}`)
        : "")
  );

  console.log(
    chalk.gray("  📊 Confidence: ") +
      confidenceBar(zombie.confidence) +
      chalk.gray(" ") +
      confidenceLabel(zombie.confidence) +
      chalk.gray(` (${zombie.confidence}/10)`)
  );

  console.log(
    chalk.gray("  💊 Cure: ") + chalk.green.italic(zombie.cure)
  );

  // Show a snippet (first 4 lines, truncated)
  const snippetLines = zombie.codeSnippet.split("\n").slice(0, 4);
  const truncated = snippetLines.join("\n");
  const hasMore =
    zombie.codeSnippet.split("\n").length > 4;

  console.log(chalk.gray("  ─────────────────────────────────────────"));
  truncated.split("\n").forEach((line) => {
    console.log(chalk.gray("  │ ") + chalk.dim(line));
  });
  if (hasMore) {
    console.log(chalk.gray("  │ ") + chalk.dim.italic("  ... (truncated)"));
  }
  console.log();
}

export function printSummary(report: ScanReport, minConfidence: number): void {
  const divider = chalk.red("═".repeat(60));
  console.log(divider);
  console.log(chalk.red.bold("  🧟 ZOMBIE SCAN COMPLETE"));
  console.log(divider);

  console.log(
    chalk.gray("  Files scanned:    ") +
      chalk.white.bold(report.scannedFiles)
  );
  console.log(
    chalk.gray("  Code chunks:      ") +
      chalk.white.bold(report.totalChunks)
  );
  console.log(
    chalk.gray("  Zombies found:    ") +
      (report.zombiesFound > 0
        ? chalk.red.bold(report.zombiesFound)
        : chalk.green.bold("0 — Codebase is clean! 🎉"))
  );
  console.log(
    chalk.gray("  Min confidence:   ") +
      chalk.yellow(`${minConfidence}/10`)
  );
  console.log(
    chalk.gray("  Duration:         ") +
      chalk.white(`${(report.durationMs / 1000).toFixed(1)}s`)
  );

  if (report.zombiesFound > 0) {
    console.log();

    // Type breakdown
    const typeCounts: Partial<Record<ZombieType, number>> = {};
    for (const r of report.results) {
      typeCounts[r.zombieType] = (typeCounts[r.zombieType] ?? 0) + 1;
    }

    console.log(chalk.gray("  By type:"));
    for (const [type, count] of Object.entries(typeCounts)) {
      const typeColor =
        ZOMBIE_TYPE_COLORS[type as ZombieType] ?? chalk.white;
      const emoji = ZOMBIE_EMOJI[type as ZombieType] ?? "🧟";
      console.log(
        chalk.gray("    •  ") +
          typeColor(`${emoji} ${type}`) +
          chalk.gray(` ×${count}`)
      );
    }
  }

  console.log(divider);
}

export function printPruneSuccess(filePath: string): void {
  console.log(
    chalk.green("  ✅ Pruned: ") + chalk.white.underline(filePath)
  );
}

export function printSkipped(count: number): void {
  if (count > 0) {
    console.log(
      chalk.gray(`\n  ⚠️  ${count} zombie(s) skipped (below confidence threshold)`)
    );
  }
}