import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { executeInBrowserSandbox, stripTypesSimple } from "./noctis-wasm-runner.ts";

describe("NOCTIS IN-BROWSER WASM / SANDBOX ENGINE", () => {
  test("Executes code, captures console.log output, and returns success", async () => {
    const code = `
      const x = 10;
      const y = 20;
      console.log("Calculated sum:", x + y);
      return x + y;
    `;
    const res = await executeInBrowserSandbox(code);

    assert.equal(res.status, "SUCCESS");
    assert.ok(res.stdout.some((line) => line.includes("Calculated sum: 30")));
    assert.equal(res.returnValue, 30);
    assert.match(res.executionSeal, /^SIG_EXEC_/);
  });

  test("Captures runtime errors in stderr without throwing exceptions", async () => {
    const code = `
      const a = undefined;
      console.log(a.nonExistentMethod());
    `;
    const res = await executeInBrowserSandbox(code);

    assert.equal(res.status, "ERROR");
    assert.ok(res.stderr.length > 0);
  });

  test("Strips TypeScript types cleanly", () => {
    const tsCode = "const num: number = 42; const str: string = 'hello';";
    const js = stripTypesSimple(tsCode);
    assert.ok(!js.includes(": number"));
    assert.ok(!js.includes(": string"));
  });

  test("Extracts runnable code from markdown blocks and executes cleanly", async () => {
    const md = `
# Sample Document
Here is some text.
\`\`\`typescript
const val = 100;
console.log("Extracted markdown run:", val * 2);
return val * 2;
\`\`\`
    `;
    const res = await executeInBrowserSandbox(md);
    assert.equal(res.status, "SUCCESS");
    assert.ok(res.stdout.some((l) => l.includes("Extracted markdown run: 200")));
    assert.equal(res.returnValue, 200);
  });
});
