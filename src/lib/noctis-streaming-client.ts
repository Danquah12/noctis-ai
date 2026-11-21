/**
 * NOCTIS AI — REAL-TIME SSE STREAMING INFERENCE CLIENT
 * OpenAI-Compatible v1 Protocol Stream Reader
 * Integrates directly with Noctis FastAPI / vLLM / RunPod inference server.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  endpoint?: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  onChunk?: (delta: string, accumulated: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface NoctisServerHealth {
  ok: boolean;
  model?: string;
  version?: string;
  device?: string;
  streamingSupported?: boolean;
  error?: string;
}

const DEFAULT_INFERENCE_URL = "http://localhost:8000";

/**
 * Resolve the active inference endpoint URL.
 * Checks localStorage -> import.meta.env -> default fallback.
 */
export function getNoctisEndpoint(): string {
  if (typeof window !== "undefined") {
    const custom = window.localStorage?.getItem("NOCTIS_INFERENCE_URL");
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  
  // @ts-ignore
  const envUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_NOCTIS_INFERENCE_URL;
  if (envUrl) {
    return String(envUrl).replace(/\/+$/, "");
  }

  return DEFAULT_INFERENCE_URL;
}

/**
 * Persist custom inference URL (e.g. RunPod HTTP proxy URL or ngrok).
 */
export function setNoctisEndpoint(url: string): void {
  if (typeof window !== "undefined") {
    if (!url || url.trim().length === 0) {
      window.localStorage?.removeItem("NOCTIS_INFERENCE_URL");
    } else {
      window.localStorage?.setItem("NOCTIS_INFERENCE_URL", url.trim().replace(/\/+$/, ""));
    }
  }
}

/**
 * Health check on Noctis inference server.
 */
export async function checkNoctisHealth(endpointUrl?: string): Promise<NoctisServerHealth> {
  const base = (endpointUrl || getNoctisEndpoint()).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return { ok: false, error: `Server returned HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      ok: data.status === "ok",
      model: data.model,
      version: data.version || "v2.0-merged",
      device: data.device,
      streamingSupported: data.streaming_supported ?? true,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || "Failed to reach inference server",
    };
  }
}

/**
 * Stream completion from Noctis OpenAI-compatible inference server.
 * Reads Server-Sent Events (SSE) chunks and dispatches real-time callbacks.
 */
export async function streamNoctisCompletion(options: StreamOptions): Promise<string> {
  const base = (options.endpoint || getNoctisEndpoint()).replace(/\/+$/, "");
  const targetUrl = base.endsWith("/v1/chat/completions") 
    ? base 
    : base.endsWith("/v1") 
      ? `${base}/chat/completions` 
      : `${base}/v1/chat/completions`;

  const payload = {
    model: options.model || "noctis-7b-v3.0-dpo",
    messages: options.messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.1,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (err: any) {
    const error = new Error(`Connection to Noctis Inference Server failed at ${targetUrl}: ${err.message}`);
    options.onError?.(error);
    throw error;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    const error = new Error(`Noctis Inference Server returned HTTP ${response.status}: ${errText}`);
    options.onError?.(error);
    throw error;
  }

  if (!response.body) {
    const error = new Error("Response body is empty or streaming not supported by browser/proxy.");
    options.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed === "data: [DONE]") {
          options.onDone?.(accumulated);
          return accumulated;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              options.onChunk?.(delta, accumulated);
            }
          } catch {
            // Ignore non-json or partial lines
          }
        }
      }
    }

    // Flush any remaining characters in buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const jsonStr = buffer.trim().slice(6);
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          accumulated += delta;
          options.onChunk?.(delta, accumulated);
        }
      } catch {
        // Ignore
      }
    }

    options.onDone?.(accumulated);
    return accumulated;
  } catch (err: any) {
    if (options.signal?.aborted) {
      options.onDone?.(accumulated);
      return accumulated;
    }
    const error = new Error(`Stream parsing error: ${err.message}`);
    options.onError?.(error);
    throw error;
  }
}
