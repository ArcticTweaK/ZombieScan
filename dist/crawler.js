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
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlDirectory = crawlDirectory;
exports.readFileContent = readFileContent;
exports.extractChunks = extractChunks;
exports.writeFileContent = writeFileContent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SUPPORTED_EXTENSIONS = new Set([".ts", ".js", ".py"]);
const IGNORED_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    ".next",
    "build",
    "coverage",
    "__pycache__",
    ".cache",
    "vendor",
    ".venv",
    "venv",
]);
const IGNORED_FILES = new Set([
    "*.min.js",
    "*.bundle.js",
    "*.d.ts",
]);
function isIgnoredFile(filePath) {
    const base = path.basename(filePath);
    return (base.endsWith(".min.js") ||
        base.endsWith(".bundle.js") ||
        base.endsWith(".d.ts") ||
        base.startsWith("."));
}
function crawlDirectory(dirPath) {
    const files = [];
    function walk(currentPath) {
        let entries;
        try {
            entries = fs.readdirSync(currentPath, { withFileTypes: true });
        }
        catch {
            return; // Skip unreadable directories
        }
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    walk(fullPath);
                }
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (SUPPORTED_EXTENSIONS.has(ext) && !isIgnoredFile(fullPath)) {
                    files.push(fullPath);
                }
            }
        }
    }
    walk(dirPath);
    return files;
}
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8");
    }
    catch {
        return null;
    }
}
// --- Language-aware chunkers ---
function extractChunksFromTypeScript(filePath, content) {
    const chunks = [];
    const lines = content.split("\n");
    // Patterns for TS/JS constructs
    const patterns = [
        // Named functions
        /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]/,
        // Arrow functions assigned to const/let/var
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        // Class methods (indented)
        /^\s+(?:async\s+)?(?:public|private|protected|static|\s)*(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?\{/,
        // Class declarations
        /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
        // Exported objects/consts (large blocks)
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*\{/,
    ];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        let matched = false;
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                const functionName = match[1];
                const blockStart = i;
                // Find the matching closing brace
                const blockEnd = findBlockEnd(lines, i);
                const blockLines = lines.slice(blockStart, blockEnd + 1);
                const blockCode = blockLines.join("\n");
                // Only include non-trivial blocks (> 3 lines)
                if (blockEnd - blockStart > 3) {
                    chunks.push({
                        filePath,
                        code: blockCode,
                        lineStart: blockStart + 1,
                        lineEnd: blockEnd + 1,
                        functionName,
                    });
                }
                i = blockEnd + 1;
                matched = true;
                break;
            }
        }
        if (!matched) {
            i++;
        }
    }
    // If no chunks were extracted (flat file), treat entire file as one chunk
    if (chunks.length === 0 && lines.length > 5) {
        chunks.push({
            filePath,
            code: content,
            lineStart: 1,
            lineEnd: lines.length,
        });
    }
    return chunks;
}
function extractChunksFromPython(filePath, content) {
    const chunks = [];
    const lines = content.split("\n");
    const defPattern = /^(def|async def|class)\s+(\w+)/;
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const match = line.match(defPattern);
        if (match) {
            const functionName = match[2];
            const blockStart = i;
            const baseIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
            // Find end of Python block by indentation
            let j = i + 1;
            while (j < lines.length) {
                const nextLine = lines[j];
                const isBlankOrComment = nextLine.trim() === "" || nextLine.trim().startsWith("#");
                const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0;
                if (!isBlankOrComment && nextIndent <= baseIndent) {
                    break;
                }
                j++;
            }
            const blockEnd = j - 1;
            const blockCode = lines.slice(blockStart, blockEnd + 1).join("\n");
            if (blockEnd - blockStart > 3) {
                chunks.push({
                    filePath,
                    code: blockCode,
                    lineStart: blockStart + 1,
                    lineEnd: blockEnd + 1,
                    functionName,
                });
            }
            i = j;
        }
        else {
            i++;
        }
    }
    if (chunks.length === 0 && lines.length > 5) {
        chunks.push({
            filePath,
            code: content,
            lineStart: 1,
            lineEnd: lines.length,
        });
    }
    return chunks;
}
function findBlockEnd(lines, startIndex) {
    let depth = 0;
    let foundOpen = false;
    for (let i = startIndex; i < lines.length; i++) {
        for (const char of lines[i]) {
            if (char === "{") {
                depth++;
                foundOpen = true;
            }
            else if (char === "}") {
                depth--;
                if (foundOpen && depth === 0) {
                    return i;
                }
            }
        }
    }
    // Fallback: return a reasonable block end
    return Math.min(startIndex + 50, lines.length - 1);
}
function extractChunks(filePath, content) {
    const ext = path.extname(filePath);
    if (ext === ".py") {
        return extractChunksFromPython(filePath, content);
    }
    else {
        return extractChunksFromTypeScript(filePath, content);
    }
}
function writeFileContent(filePath, content) {
    fs.writeFileSync(filePath, content, "utf-8");
}
