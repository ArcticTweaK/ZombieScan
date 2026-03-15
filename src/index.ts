#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import * as path from "path";
import * as fs from "fs";

import { crawlDirectory, readFileContent, extractChunks, writeFileContent } from "./crawler";
import { analyzeChunk, generatePrunedCode } from "./scanService";
import {
  printBanner,
  printZombieResult,
  printSummary,
  printPruneSuccess,
} from "./reporter";
import { ScanOptions, ScanReport, ZombieResult } from "./types";

const program = new Command();

program
  .name("zombie-scan")
  .description("🧟 AI-powered Zombie Code detector — find and eliminate semantically dead code")
  .version("1.0.0");

program
  .argument("[path]", "Directory or file to scan", ".")
  .option("-d, --dry-run", "List zombies without modifying any files", false)
  .option("-p, --prune", "Interactively remove zombie code from files", false)
  .option(
    "-c, --min-confidence <number>",
    "Minimum confidence score to report (1-10)",
    "6"
  )
  .option("-v, --verbose", "Show all analyzed chunks", false)
  .action(async (targetPath: string, options) => {
    const scanOptions: ScanOptions = {
      path: path.resolve(targetPath),
      dryRun: options.dryRun || (!options.prune), // default to dry-run if no flag given
      prune: options.prune,
      minConfidence: parseInt(options.minConfidence, 10),
      verbose: options.verbose,
    };

    // Validate the path exists
    if (!fs.existsSync(scanOptions.path)) {
      console.error(chalk.red(`\n  ✗ Path not found: ${scanOptions.path}\n`));
      process.exit(1);
    }

    printBanner();

    const modeLabel = scanOptions.prune
      ? chalk.red.bold("⚠️  PRUNE MODE") + chalk.gray(" (will modify files)")
      : chalk.yellow.bold("🔍 DRY-RUN MODE") + chalk.gray(" (read-only)");

    console.log(chalk.gray("  Mode:    ") + modeLabel);
    console.log(chalk.gray("  Target:  ") + chalk.white(scanOptions.path));
    console.log(
      chalk.gray("  Min confidence: ") +
        chalk.yellow(`${scanOptions.minConfidence}/10`)
    );
    console.log();

    // --- Crawl ---
    const spinner = ora({
      text: chalk.gray("Crawling directory..."),
      color: "red",
    }).start();

    const files = crawlDirectory(scanOptions.path);

    if (files.length === 0) {
      spinner.fail(chalk.yellow("No supported files found (.ts, .js, .py)"));
      process.exit(0);
    }

    spinner.succeed(
      chalk.gray(`Found `) +
        chalk.white.bold(files.length) +
        chalk.gray(` file(s) to analyze`)
    );
    console.log();

    // --- Analyze ---
    const startTime = Date.now();
    const allZombies: ZombieResult[] = [];
    let totalChunks = 0;

    for (let fi = 0; fi < files.length; fi++) {
      const filePath = files[fi];
      const relPath = path.relative(process.cwd(), filePath);
      const content = readFileContent(filePath);

      if (!content) continue;

      const chunks = extractChunks(filePath, content);
      totalChunks += chunks.length;

      const fileSpinner = ora({
        text: chalk.gray(
          `[${fi + 1}/${files.length}] Scanning ${chalk.white(relPath)} — ${chunks.length} chunk(s)`
        ),
        color: "yellow",
        indent: 2,
      }).start();

      const fileZombies: ZombieResult[] = [];

      for (const chunk of chunks) {
        const result = await analyzeChunk(chunk);
        if (result && result.confidence >= scanOptions.minConfidence) {
          fileZombies.push(result);
          allZombies.push(result);
        }
      }

      if (fileZombies.length > 0) {
        fileSpinner.succeed(
          chalk.gray(`[${fi + 1}/${files.length}] `) +
            chalk.white(relPath) +
            chalk.red(` — ${fileZombies.length} zombie(s) found 🧟`)
        );
      } else {
        fileSpinner.succeed(
          chalk.gray(`[${fi + 1}/${files.length}] `) +
            chalk.gray(relPath) +
            chalk.green(" — clean ✓")
        );
      }
    }

    const report: ScanReport = {
      scannedFiles: files.length,
      totalChunks,
      zombiesFound: allZombies.length,
      results: allZombies,
      durationMs: Date.now() - startTime,
    };

    // --- Report ---
    console.log();
    if (allZombies.length > 0) {
      console.log(
        chalk.red.bold(`  🧟 ${allZombies.length} ZOMBIE(S) IDENTIFIED:\n`)
      );
      allZombies.forEach((z, i) => printZombieResult(z, i));
    }

    printSummary(report, scanOptions.minConfidence);

    // --- Prune ---
    if (scanOptions.prune && allZombies.length > 0) {
      console.log();
      console.log(
        chalk.red.bold("  ⚠️  WARNING: ") +
          chalk.white("PRUNE MODE will modify your source files.")
      );
      console.log(
        chalk.gray("  Commit or backup your work before proceeding.\n")
      );

      const { confirmed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message: chalk.red(
            `  Prune all ${allZombies.length} zombie(s) from ${[...new Set(allZombies.map((z) => z.filePath))].length} file(s)?`
          ),
          default: false,
        },
      ]);

      if (!confirmed) {
        console.log(chalk.gray("\n  Pruning cancelled.\n"));
        process.exit(0);
      }

      console.log();
      const pruneSpinner = ora({
        text: chalk.gray("Pruning zombie code..."),
        color: "red",
      }).start();

      // Group zombies by file
      const zombiesByFile = new Map<string, ZombieResult[]>();
      for (const z of allZombies) {
        if (!zombiesByFile.has(z.filePath)) {
          zombiesByFile.set(z.filePath, []);
        }
        zombiesByFile.get(z.filePath)!.push(z);
      }

      for (const [filePath, zombies] of zombiesByFile) {
        let content = readFileContent(filePath);
        if (!content) continue;

        // Process zombies one at a time (most impactful first)
        const sorted = [...zombies].sort((a, b) => b.confidence - a.confidence);

        pruneSpinner.text = chalk.gray(
          `  Pruning ${path.relative(process.cwd(), filePath)}...`
        );
        content = await generatePrunedCode(content, sorted);

        writeFileContent(filePath, content);
        printPruneSuccess(path.relative(process.cwd(), filePath));
      }

      pruneSpinner.stop();
      console.log();
      console.log(
        chalk.green.bold(`  ✅ Pruning complete! ${allZombies.length} zombie(s) eliminated.\n`)
      );
    }
  });

program.parse(process.argv);