import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getNoctisEndpoint,
  setNoctisEndpoint,
  checkNoctisHealth,
  streamNoctisCompletion,
} from "./noctis-streaming-client.ts";

describe("Noctis Streaming Client", () => {
  test("getNoctisEndpoint returns default fallback when no window/storage", () => {
    const endpoint = getNoctisEndpoint();
    assert.strictEqual(typeof endpoint, "string");
    assert.ok(endpoint.startsWith("http"));
  });

  test("streamNoctisCompletion parses SSE chunks properly into accumulated string", async () => {
    const mockChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"Calcium"}}]}\n\n',
      'data: {"id":"2","choices":[{"delta":{"content":" Gluconate"}}]}\n\n',
      'data: {"id":"3","choices":[{"delta":{"content":" 10%"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of mockChunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });

    try {
      const receivedDeltas: string[] = [];
      const result = await streamNoctisCompletion({
        endpoint: "http://localhost:8000",
        messages: [{ role: "user", content: "test" }],
        onChunk: (delta) => {
          receivedDeltas.push(delta);
        },
      });

      assert.strictEqual(result, "Calcium Gluconate 10%");
      assert.deepStrictEqual(receivedDeltas, ["Calcium", " Gluconate", " 10%"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("checkNoctisHealth handles server response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          status: "ok",
          version: "v3.0-dpo-aligned",
          model: "./models/noctis-7b-v2.0-merged",
          device: "cuda",
          streaming_supported: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    try {
      const health = await checkNoctisHealth("http://localhost:8000");
      assert.strictEqual(health.ok, true);
      assert.strictEqual(health.version, "v3.0-dpo-aligned");
      assert.strictEqual(health.streamingSupported, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("streamNoctisCompletion reports error on HTTP failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("Internal Server Error", { status: 500 });

    try {
      let errorFired = false;
      await assert.rejects(
        streamNoctisCompletion({
          endpoint: "http://localhost:8000",
          messages: [{ role: "user", content: "test" }],
          onError: () => {
            errorFired = true;
          },
        }),
        /Noctis Inference Server returned HTTP 500/
      );
      assert.strictEqual(errorFired, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
