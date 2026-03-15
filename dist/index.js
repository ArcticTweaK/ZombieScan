#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crawler_1 = require("./crawler");
const scanService_1 = require("./scanService");
const reporter_1 = require("./reporter");
const program = new commander_1.Command();
program
    .name("zombie-scan")
    .description("🧟 AI-powered Zombie Code detector — find and eliminate semantically dead code")
    .version("1.0.0");
program
    .argument("[path]", "Directory or file to scan", ".")
    .option("-d, --dry-run", "List zombies without modifying any files", false)
    .option("-p, --prune", "Interactively remove zombie code from files", false)
    .option("-c, --min-confidence <number>", "Minimum confidence score to report (1-10)", "6")
    .option("-v, --verbose", "Show all analyzed chunks", false)
    .action(async (targetPath, options) => {
    const scanOptions = {
        path: path.resolve(targetPath),
        dryRun: options.dryRun || (!options.prune), // default to dry-run if no flag given
        prune: options.prune,
        minConfidence: parseInt(options.minConfidence, 10),
        verbose: options.verbose,
    };
    // Validate the path exists
    if (!fs.existsSync(scanOptions.path)) {
        console.error(chalk_1.default.red(`\n  ✗ Path not found: ${scanOptions.path}\n`));
        process.exit(1);
    }
    (0, reporter_1.printBanner)();
    const modeLabel = scanOptions.prune
        ? chalk_1.default.red.bold("⚠️  PRUNE MODE") + chalk_1.default.gray(" (will modify files)")
        : chalk_1.default.yellow.bold("🔍 DRY-RUN MODE") + chalk_1.default.gray(" (read-only)");
    console.log(chalk_1.default.gray("  Mode:    ") + modeLabel);
    console.log(chalk_1.default.gray("  Target:  ") + chalk_1.default.white(scanOptions.path));
    console.log(chalk_1.default.gray("  Min confidence: ") +
        chalk_1.default.yellow(`${scanOptions.minConfidence}/10`));
    console.log();
    // --- Crawl ---
    const spinner = (0, ora_1.default)({
        text: chalk_1.default.gray("Crawling directory..."),
        color: "red",
    }).start();
    const files = (0, crawler_1.crawlDirectory)(scanOptions.path);
    if (files.length === 0) {
        spinner.fail(chalk_1.default.yellow("No supported files found (.ts, .js, .py)"));
        process.exit(0);
    }
    spinner.succeed(chalk_1.default.gray(`Found `) +
        chalk_1.default.white.bold(files.length) +
        chalk_1.default.gray(` file(s) to analyze`));
    console.log();
    // --- Analyze ---
    const startTime = Date.now();
    const allZombies = [];
    let totalChunks = 0;
    for (let fi = 0; fi < files.length; fi++) {
        const filePath = files[fi];
        const relPath = path.relative(process.cwd(), filePath);
        const content = (0, crawler_1.readFileContent)(filePath);
        if (!content)
            continue;
        const chunks = (0, crawler_1.extractChunks)(filePath, content);
        totalChunks += chunks.length;
        const fileSpinner = (0, ora_1.default)({
            text: chalk_1.default.gray(`[${fi + 1}/${files.length}] Scanning ${chalk_1.default.white(relPath)} — ${chunks.length} chunk(s)`),
            color: "yellow",
            indent: 2,
        }).start();
        const fileZombies = [];
        for (const chunk of chunks) {
            const result = await (0, scanService_1.analyzeChunk)(chunk);
            if (result && result.confidence >= scanOptions.minConfidence) {
                fileZombies.push(result);
                allZombies.push(result);
            }
        }
        if (fileZombies.length > 0) {
            fileSpinner.succeed(chalk_1.default.gray(`[${fi + 1}/${files.length}] `) +
                chalk_1.default.white(relPath) +
                chalk_1.default.red(` — ${fileZombies.length} zombie(s) found 🧟`));
        }
        else {
            fileSpinner.succeed(chalk_1.default.gray(`[${fi + 1}/${files.length}] `) +
                chalk_1.default.gray(relPath) +
                chalk_1.default.green(" — clean ✓"));
        }
    }
    const report = {
        scannedFiles: files.length,
        totalChunks,
        zombiesFound: allZombies.length,
        results: allZombies,
        durationMs: Date.now() - startTime,
    };
    // --- Report ---
    console.log();
    if (allZombies.length > 0) {
        console.log(chalk_1.default.red.bold(`  🧟 ${allZombies.length} ZOMBIE(S) IDENTIFIED:\n`));
        allZombies.forEach((z, i) => (0, reporter_1.printZombieResult)(z, i));
    }
    (0, reporter_1.printSummary)(report, scanOptions.minConfidence);
    // --- Prune ---
    if (scanOptions.prune && allZombies.length > 0) {
        console.log();
        console.log(chalk_1.default.red.bold("  ⚠️  WARNING: ") +
            chalk_1.default.white("PRUNE MODE will modify your source files."));
        console.log(chalk_1.default.gray("  Commit or backup your work before proceeding.\n"));
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "confirmed",
                message: chalk_1.default.red(`  Prune all ${allZombies.length} zombie(s) from ${[...new Set(allZombies.map((z) => z.filePath))].length} file(s)?`),
                default: false,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.gray("\n  Pruning cancelled.\n"));
            process.exit(0);
        }
        console.log();
        const pruneSpinner = (0, ora_1.default)({
            text: chalk_1.default.gray("Pruning zombie code..."),
            color: "red",
        }).start();
        // Group zombies by file
        const zombiesByFile = new Map();
        for (const z of allZombies) {
            if (!zombiesByFile.has(z.filePath)) {
                zombiesByFile.set(z.filePath, []);
            }
            zombiesByFile.get(z.filePath).push(z);
        }
        for (const [filePath, zombies] of zombiesByFile) {
            let content = (0, crawler_1.readFileContent)(filePath);
            if (!content)
                continue;
            // Process zombies one at a time (most impactful first)
            const sorted = [...zombies].sort((a, b) => b.confidence - a.confidence);
            pruneSpinner.text = chalk_1.default.gray(`  Pruning ${path.relative(process.cwd(), filePath)}...`);
            content = await (0, scanService_1.generatePrunedCode)(content, sorted);
            (0, crawler_1.writeFileContent)(filePath, content);
            (0, reporter_1.printPruneSuccess)(path.relative(process.cwd(), filePath));
        }
        pruneSpinner.stop();
        console.log();
        console.log(chalk_1.default.green.bold(`  ✅ Pruning complete! ${allZombies.length} zombie(s) eliminated.\n`));
    }
});
program.parse(process.argv);
