"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBanner = printBanner;
exports.printZombieResult = printZombieResult;
exports.printSummary = printSummary;
exports.printPruneSuccess = printPruneSuccess;
exports.printSkipped = printSkipped;
const chalk_1 = __importDefault(require("chalk"));
const ZOMBIE_TYPE_COLORS = {
    "Manual Polyfill": chalk_1.default.cyan,
    "Legacy Debugger": chalk_1.default.yellow,
    "Orphaned Logic": chalk_1.default.magenta,
    "Dead Feature Flag": chalk_1.default.red,
    "Redundant Abstraction": chalk_1.default.blue,
    "Obsolete Workaround": chalk_1.default.green,
    "Vestigial Import": chalk_1.default.gray,
    "Zombie Comment Block": chalk_1.default.white,
};
const ZOMBIE_EMOJI = {
    "Manual Polyfill": "🔧",
    "Legacy Debugger": "🐛",
    "Orphaned Logic": "👻",
    "Dead Feature Flag": "🚩",
    "Redundant Abstraction": "🪞",
    "Obsolete Workaround": "🦕",
    "Vestigial Import": "📦",
    "Zombie Comment Block": "💬",
};
function confidenceBar(score) {
    const filled = Math.round(score);
    const empty = 10 - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    if (score >= 8)
        return chalk_1.default.red(bar);
    if (score >= 5)
        return chalk_1.default.yellow(bar);
    return chalk_1.default.green(bar);
}
function confidenceLabel(score) {
    if (score >= 9)
        return chalk_1.default.red.bold("CERTAIN");
    if (score >= 7)
        return chalk_1.default.red("HIGH");
    if (score >= 5)
        return chalk_1.default.yellow("MEDIUM");
    return chalk_1.default.green("LOW");
}
function printBanner() {
    console.log(chalk_1.default.red.bold(`
 ░▒▓███████▓▒░░▒▓██████▓▒░░▒▓██████████████▓▒░░▒▓███████▓▒░░▒▓█▓▒░▒▓████████▓▒░
        ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
        ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
 ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░▒▓██████▓▒░
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░
░▒▓████████▓▒░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░▒▓████████▓▒░`));
    console.log(chalk_1.default.gray("  🧟 AI-Powered Zombie Code Detector  ") +
        chalk_1.default.red.dim("[ eliminate the undead ]"));
    console.log();
}
function printZombieResult(zombie, index) {
    const typeColor = ZOMBIE_TYPE_COLORS[zombie.zombieType] ?? chalk_1.default.white;
    const emoji = ZOMBIE_EMOJI[zombie.zombieType] ?? "🧟";
    const header = chalk_1.default.bgRed.white.bold(` ZOMBIE #${index + 1} `) +
        " " +
        typeColor.bold(`${emoji} ${zombie.zombieType}`);
    console.log(header);
    console.log(chalk_1.default.gray("  📄 ") +
        chalk_1.default.white.underline(zombie.filePath) +
        chalk_1.default.gray(` (lines ${zombie.lineStart}–${zombie.lineEnd})`) +
        (zombie.functionName
            ? chalk_1.default.gray(` · `) + chalk_1.default.cyan(`fn: ${zombie.functionName}`)
            : ""));
    console.log(chalk_1.default.gray("  📊 Confidence: ") +
        confidenceBar(zombie.confidence) +
        chalk_1.default.gray(" ") +
        confidenceLabel(zombie.confidence) +
        chalk_1.default.gray(` (${zombie.confidence}/10)`));
    console.log(chalk_1.default.gray("  💊 Cure: ") + chalk_1.default.green.italic(zombie.cure));
    // Show a snippet (first 4 lines, truncated)
    const snippetLines = zombie.codeSnippet.split("\n").slice(0, 4);
    const truncated = snippetLines.join("\n");
    const hasMore = zombie.codeSnippet.split("\n").length > 4;
    console.log(chalk_1.default.gray("  ─────────────────────────────────────────"));
    truncated.split("\n").forEach((line) => {
        console.log(chalk_1.default.gray("  │ ") + chalk_1.default.dim(line));
    });
    if (hasMore) {
        console.log(chalk_1.default.gray("  │ ") + chalk_1.default.dim.italic("  ... (truncated)"));
    }
    console.log();
}
function printSummary(report, minConfidence) {
    const divider = chalk_1.default.red("═".repeat(60));
    console.log(divider);
    console.log(chalk_1.default.red.bold("  🧟 ZOMBIE SCAN COMPLETE"));
    console.log(divider);
    console.log(chalk_1.default.gray("  Files scanned:    ") +
        chalk_1.default.white.bold(report.scannedFiles));
    console.log(chalk_1.default.gray("  Code chunks:      ") +
        chalk_1.default.white.bold(report.totalChunks));
    console.log(chalk_1.default.gray("  Zombies found:    ") +
        (report.zombiesFound > 0
            ? chalk_1.default.red.bold(report.zombiesFound)
            : chalk_1.default.green.bold("0 — Codebase is clean! 🎉")));
    console.log(chalk_1.default.gray("  Min confidence:   ") +
        chalk_1.default.yellow(`${minConfidence}/10`));
    console.log(chalk_1.default.gray("  Duration:         ") +
        chalk_1.default.white(`${(report.durationMs / 1000).toFixed(1)}s`));
    if (report.zombiesFound > 0) {
        console.log();
        // Type breakdown
        const typeCounts = {};
        for (const r of report.results) {
            typeCounts[r.zombieType] = (typeCounts[r.zombieType] ?? 0) + 1;
        }
        console.log(chalk_1.default.gray("  By type:"));
        for (const [type, count] of Object.entries(typeCounts)) {
            const typeColor = ZOMBIE_TYPE_COLORS[type] ?? chalk_1.default.white;
            const emoji = ZOMBIE_EMOJI[type] ?? "🧟";
            console.log(chalk_1.default.gray("    •  ") +
                typeColor(`${emoji} ${type}`) +
                chalk_1.default.gray(` ×${count}`));
        }
    }
    console.log(divider);
}
function printPruneSuccess(filePath) {
    console.log(chalk_1.default.green("  ✅ Pruned: ") + chalk_1.default.white.underline(filePath));
}
function printSkipped(count) {
    if (count > 0) {
        console.log(chalk_1.default.gray(`\n  ⚠️  ${count} zombie(s) skipped (below confidence threshold)`));
    }
}
