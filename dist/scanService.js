"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeChunk = analyzeChunk;
exports.generatePrunedCode = generatePrunedCode;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
    ollama: "qwen3:8b",
    anthropic: "claude-sonnet-4-20250514",
    openrouter: "mistralai/mistral-7b-instruct:free",
};
// ─── Prompts ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Cynical Senior Architect with 20+ years of experience. Your singular obsession is ruthlessly minimizing codebases. You have zero tolerance for dead weight.
 
Zombie Code categories:
- Manual Polyfill: Reimplementing something now native to the language/runtime
- Legacy Debugger: console.log, print(), debug statements left in production code
- Orphaned Logic: Functions never wired into the actual app flow
- Dead Feature Flag: Feature flag checks where the flag is hardcoded true/false
- Redundant Abstraction: A wrapper that does nothing but call through to one other function
- Obsolete Workaround: Browser/env workarounds for bugs that no longer exist
- Vestigial Import: Imports of modules not actually used in the code block
- Zombie Comment Block: Large blocks of commented-out code
 
Respond ONLY with raw JSON. No markdown, no explanation, no think blocks.
If zombie: {"isZombie":true,"zombieType":"<category>","confidence":<1-10>,"cure":"<one sentence>"}
If clean: {"isZombie":false}`;
const PRUNE_SYSTEM = `You are a precise code surgeon. Return ONLY the complete cleaned file content. No JSON. No markdown fences. No explanations. Just raw source code.`;
// ─── Provider Implementations ─────────────────────────────────────────────────
async function callOllama(systemPrompt, userPrompt, model) {
    const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: 0.1, num_predict: 1024 },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });
    if (!response.ok)
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return data.message.content;
}
async function callAnthropic(systemPrompt, userPrompt, model) {
    const client = new sdk_1.default();
    const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
    });
    return response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
}
async function callOpenRouter(systemPrompt, userPrompt, model, apiKey) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://github.com/zombie-scan",
            "X-Title": "ZombieScan",
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: 1024,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });
    if (!response.ok)
        throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return data.choices[0].message.content;
}
// ─── Unified Caller ───────────────────────────────────────────────────────────
async function callProvider(systemPrompt, userPrompt, config) {
    const model = config.model ?? DEFAULTS[config.provider];
    if (process.env.ZOMBIE_DEBUG) {
        console.error(`\n[debug] provider=${config.provider} model=${model}`);
    }
    let result;
    switch (config.provider) {
        case "ollama":
            result = await callOllama(systemPrompt, userPrompt, model);
            break;
        case "anthropic":
            result = await callAnthropic(systemPrompt, userPrompt, model);
            break;
        case "openrouter":
            if (!config.apiKey)
                throw new Error("OpenRouter requires --api-key or OPENROUTER_API_KEY env var");
            result = await callOpenRouter(systemPrompt, userPrompt, model, config.apiKey);
            break;
        default:
            throw new Error(`Unknown provider: ${config.provider}`);
    }
    if (process.env.ZOMBIE_DEBUG) {
        console.error(`[debug] raw: ${JSON.stringify(result).slice(0, 300)}`);
    }
    return result;
}
async function analyzeChunk(chunk, config) {
    const userPrompt = `Analyze this code from \`${chunk.filePath}\`:\n\`\`\`\n${chunk.code}\n\`\`\`\nIs this Zombie Code? JSON only.`;
    try {
        const rawText = await callProvider(SYSTEM_PROMPT, userPrompt, config);
        const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const jsonMatch = stripped.match(/\{[\s\S]*?\}/s);
        if (!jsonMatch)
            return null;
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.isZombie)
            return null;
        return {
            filePath: chunk.filePath,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            zombieType: parsed.zombieType,
            confidence: parsed.confidence,
            codeSnippet: chunk.code,
            cure: parsed.cure,
            functionName: chunk.functionName,
        };
    }
    catch (err) {
        if (process.env.ZOMBIE_DEBUG) {
            console.error("[debug] chunk failed:", err);
        }
        return null;
    }
}
async function generatePrunedCode(originalCode, zombies, config) {
    const zombieList = zombies
        .map((z, i) => `${i + 1}. Lines ${z.lineStart}-${z.lineEnd} | ${z.zombieType} | Fix: ${z.cure}`)
        .join("\n");
    const userPrompt = `Remove these zombie code sections and return the complete cleaned file:\n\n${zombieList}\n\nFull file:\n\`\`\`\n${originalCode}\n\`\`\`\n\nReturn only the cleaned file:`;
    const result = await callProvider(PRUNE_SYSTEM, userPrompt, config);
    return result
        .replace(/^```[\w]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
}
