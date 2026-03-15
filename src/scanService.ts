import { CodeChunk, ZombieResult, ZombieType } from "./types";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen3:8b";

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

interface ZombieAnalysis {
  isZombie: boolean;
  zombieType?: ZombieType;
  confidence?: number;
  cure?: string;
}

async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  if (process.env.ZOMBIE_DEBUG) {
    console.error("\n[debug] calling ollama:", MODEL);
  }
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 1024 },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (process.env.ZOMBIE_DEBUG) {
    console.error("[debug] status:", response.status);
  }
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as { message: { content: string } };
  if (process.env.ZOMBIE_DEBUG) {
    console.error("[debug] raw:", JSON.stringify(data.message.content).slice(0, 600));
  }
  return data.message.content;
}

export async function analyzeChunk(chunk: CodeChunk): Promise<ZombieResult | null> {
  const userPrompt = `Analyze this code from \`${chunk.filePath}\`:\n\`\`\`\n${chunk.code}\n\`\`\`\nIs this Zombie Code? JSON only.`;
  try {
    const rawText = await callOllama(SYSTEM_PROMPT, userPrompt);
    const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*?\}/s);
    if (!jsonMatch) return null;
    const parsed: ZombieAnalysis = JSON.parse(jsonMatch[0]);
    if (!parsed.isZombie) return null;
    return {
      filePath: chunk.filePath,
      lineStart: chunk.lineStart,
      lineEnd: chunk.lineEnd,
      zombieType: parsed.zombieType!,
      confidence: parsed.confidence!,
      codeSnippet: chunk.code,
      cure: parsed.cure!,
      functionName: chunk.functionName,
    };
  } catch (err) {
    if (process.env.ZOMBIE_DEBUG) {
      console.error("[debug] chunk failed:", err);
    }
    return null;
  }
}

export async function generatePrunedCode(
  originalCode: string,
  zombies: ZombieResult[]
): Promise<string> {
  const zombieList = zombies
    .map((z, i) => `${i + 1}. Lines ${z.lineStart}-${z.lineEnd} | ${z.zombieType} | Fix: ${z.cure}`)
    .join("\n");

  const userPrompt = `Remove these zombie code sections from the file and return the complete cleaned result:\n\n${zombieList}\n\nFull file:\n\`\`\`\n${originalCode}\n\`\`\`\n\nReturn only the cleaned file:`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 4096 },
      messages: [
        { role: "system", content: PRUNE_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json() as { message: { content: string } };
  return data.message.content
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}