# 🧟 ZombieScan

> **AI-powered CLI tool that hunts down Zombie Code** — logic that is syntactically correct and reachable, but semantically dead, redundant, or a relic of a past era that standard linters will never catch.

---

## What is Zombie Code?

Standard linters catch syntax errors and style violations. They cannot answer:

> *"Does this function actually do anything useful anymore?"*

**ZombieScan can.**

It uses a locally-running AI model via Ollama to semantically analyze your code and identify dead weight that has accumulated silently over years of development. No API keys. No cloud. No cost. Runs entirely on your machine.

| Type | Description | Example |
|---|---|---|
| 🔧 **Manual Polyfill** | Reimplementing something now native to the language | Custom `Object.assign` shim, hand-rolled `Promise.all` |
| 🐛 **Legacy Debugger** | `console.log`, `print()`, debug statements in production | `console.log("DEBUG:", data)` |
| 👻 **Orphaned Logic** | Functions never wired into the actual app flow | `normalizePhoneNumber()` called nowhere |
| 🚩 **Dead Feature Flag** | Feature flags hardcoded to `true` or `false` | `if (NEW_UI_ENABLED)` — always true |
| 🪞 **Redundant Abstraction** | A wrapper that just calls one other function | `function save(x) { return db.save(x); }` |
| 🦕 **Obsolete Workaround** | Hacks for bugs that no longer exist | IE11 flexbox fix, Safari 12 Promise patch |
| 📦 **Vestigial Import** | Modules imported but never actually used | `import _ from 'lodash'` — unused |
| 💬 **Zombie Comment Block** | Large blocks of commented-out old code | `// const oldFlow = () => { ... }` |

---

## How It Works

```
1. Crawl   →  Recursively finds .ts, .js, .py files in the target directory
2. Chunk   →  Extracts individual functions and logic blocks per file
3. Analyze →  Each chunk is sent to the AI with a "Cynical Senior Architect" prompt
4. Report  →  Color-coded terminal output: file, lines, zombie type, confidence, cure
5. Prune   →  (Optional) AI surgically removes the dead code and saves the file
```

The AI model acts as a **Cynical Senior Architect** — ruthlessly evaluating whether each block of code performs a meaningful operation in the context of a modern application.

---

## Prerequisites

- **Node.js** v18 or higher
- **Ollama** installed and running — [ollama.com](https://ollama.com)
- At least one model pulled (see recommended models below)

---

## Installation

**1. Clone and install dependencies:**

```bash
git clone https://github.com/ArcticTweaK/ZombieScan
cd zombie-scan
npm install
npm run build
```

**2. Make sure Ollama is running with a model pulled:**

```bash
ollama pull qwen3:8b
ollama list  # verify it's there
```

**3. (Optional) Link as a global command:**

```bash
npm link
# now you can run `zombie-scan` from anywhere
```

---

## Usage

```bash
# Scan current directory (dry-run by default)
node dist/index.js .

# Scan a specific directory or file
node dist/index.js ./src
node dist/index.js ./src/utils.ts

# Only show high-confidence zombies (8+/10)
node dist/index.js ./src --min-confidence 8

# Prune mode — AI removes dead code and saves files
node dist/index.js ./src --prune
```

### Flags

| Flag | Default | Description |
|---|---|---|
| `--dry-run` / `-d` | ✅ on | Scan and report without touching any files |
| `--prune` / `-p` | off | Interactively remove zombie code and save files |
| `--min-confidence <n>` | `6` | Only report zombies scored n/10 or higher (1–10) |
| `--verbose` / `-v` | off | Show extra detail during analysis |

---

## Sample Output

```
 🧟 4 ZOMBIE(S) IDENTIFIED:

 ZOMBIE #1  🔧 Manual Polyfill
  📄 src/userService.ts (lines 6–19) · fn: shallowMerge
  📊 Confidence: ██████████ CERTAIN (10/10)
  💊 Cure: Replace with Object.assign(target, source)
  ─────────────────────────────────────────
  │ function shallowMerge(target, source) {
  │   const result = Object.create(null);
  │   for (const key in target) { ... }
  │   ... (truncated)

 ZOMBIE #2  🐛 Legacy Debugger
  📄 src/userService.ts (lines 22–28) · fn: fetchUserProfile
  📊 Confidence: █████████░ CERTAIN (9/10)
  💊 Cure: Remove all console.log statements from production code

════════════════════════════════════════════════════════════
  🧟 ZOMBIE SCAN COMPLETE
════════════════════════════════════════════════════════════
  Files scanned:    1
  Code chunks:      6
  Zombies found:    4
  Min confidence:   6/10
  Duration:         26.4s

  By type:
    •  🔧 Manual Polyfill ×2
    •  🐛 Legacy Debugger ×1
    •  🚩 Dead Feature Flag ×1
════════════════════════════════════════════════════════════
```

### Confidence Score Guide

| Score | Label | Meaning |
|---|---|---|
| 9–10 | 🔴 CERTAIN | Near-certain zombie. Safe to remove. |
| 7–8 | 🟠 HIGH | Very likely dead code. Review before removing. |
| 5–6 | 🟡 MEDIUM | Suspicious. Investigate before acting. |
| 1–4 | 🟢 LOW | Uncertain. Use your judgment. |

---

## Prune Mode

> ⚠️ **Prune mode modifies your source files. Always commit or back up your work first.**

When `--prune` is passed, ZombieScan will:

1. Run the full scan and display all detected zombies
2. Ask for explicit confirmation before modifying any file
3. Send all zombies for a given file to the AI in a single pass
4. Save the cleaned file back to disk
5. Report which files were pruned

```bash
node dist/index.js ./src --prune

# You will be prompted:
# ⚠️  WARNING: PRUNE MODE will modify your source files.
# Commit or backup your work before proceeding.
# Prune all 4 zombie(s) from 1 file(s)? (y/N)
```

---

## Recommended Models

ZombieScan runs on any model available in Ollama. These are the best options:

| Model | Size | Speed | Quality | Command |
|---|---|---|---|---|
| `qwen3:8b` | 5 GB | ⚡ Fast | ⭐⭐⭐⭐ | `ollama pull qwen3:8b` |
| `qwen3-coder:30b` | 18 GB | 🐢 Slow | ⭐⭐⭐⭐⭐ | `ollama pull qwen3-coder:30b` |

To switch models, change the `MODEL` constant at the top of `src/scanService.ts`:

```typescript
const MODEL = "qwen3-coder:30b"; // swap to any ollama model
```

---

## Performance

Scan time scales with the number of code chunks — one AI call per function or block.

| Project Size | ~Files | ~Chunks | Est. Time (`qwen3:8b`) |
|---|---|---|---|
| Small utility | 5–10 | 20–50 | 1–3 min |
| Medium app | 50–100 | 200–500 | 15–40 min |
| Large project | 500+ | 2,000+ | 2–5 hours |

**Tips for large codebases:**
- Scan subdirectories individually rather than the whole project at once
- Use `--min-confidence 8` to surface only the most obvious zombies
- Use `qwen3:8b` for speed; switch to `qwen3-coder:30b` for critical files

---

## Project Structure

```
zombie-scan/
├── src/
│   ├── index.ts          # CLI entry point (commander)
│   ├── crawler.ts        # File walker + language-aware chunk extractor
│   ├── scanService.ts    # Ollama integration + AI analysis logic
│   ├── reporter.ts       # Color-coded terminal output
│   └── types.ts          # Shared TypeScript interfaces
├── sample/
│   └── userService.ts    # Example file with 5 hand-crafted zombies
├── dist/                 # Compiled JS output (auto-generated, do not edit)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Supported Languages

| Language | Extensions | Chunk Strategy |
|---|---|---|
| TypeScript | `.ts` | Brace-depth tracking — functions, classes, arrow functions |
| JavaScript | `.js` | Brace-depth tracking — functions, classes, arrow functions |
| Python | `.py` | Indentation-aware — `def`, `async def`, `class` |

**Automatically ignored:**
`node_modules`, `dist`, `.git`, `.next`, `build`, `__pycache__`, `.venv`, `*.min.js`, `*.bundle.js`, `*.d.ts`

---

## Testing with the Sample File

The repo includes a pre-built zombie-infested file for immediate testing:

```bash
node dist/index.js sample/
```

`sample/userService.ts` contains five hand-crafted zombies:

1. `shallowMerge()` — Manual `Object.assign` polyfill written for IE11
2. `fetchUserProfile()` — Real function polluted with three `DEBUG` console.logs
3. `normalizePhoneNumber()` — Orphaned v1 migration logic, never called anywhere
4. `renderCheckout()` — Dead feature flag with an unreachable `else` branch
5. `safariSafePromiseAll()` — Safari 12 `Promise.all` workaround, fixed in 2019

---

## Why Not Just Use a Linter?

Linters operate on syntax and static rules. They cannot reason about *intent* or *context*.

A polyfill is syntactically valid code. An orphaned function passes all type checks. A hardcoded feature flag looks like normal logic. Only semantic analysis can identify these — and that requires AI.

ZombieScan is designed to **complement** tools like ESLint, Pylint, and TypeScript's type checker — not replace them.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*🧟 ZombieScan — Built with Node.js, TypeScript, Commander, and Ollama. Runs 100% locally. Free forever.*
