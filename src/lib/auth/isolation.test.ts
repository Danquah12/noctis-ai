import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedSameSiteRequest } from "./isolation-policy.ts";

describe("isAllowedSameSiteRequest", () => {
  it("allows same-origin requests and server-to-server requests without Sec-Fetch-Site", () => {
    const serverReq = new Request("https://www.dstrike.app/_serverFn/test", {
      method: "POST",
    });
    assert.equal(isAllowedSameSiteRequest(serverReq), true);

    const sameOriginReq = new Request("https://www.dstrike.app/_serverFn/test", {
      method: "POST",
      headers: {
        "sec-fetch-site": "same-origin",
        host: "www.dstrike.app",
        origin: "https://www.dstrike.app",
      },
    });
    assert.equal(isAllowedSameSiteRequest(sameOriginReq), true);
  });

  it("allows same-origin POST from inside a cross-site iframe", () => {
    const iframePost = new Request("https://www.dstrike.app/_serverFn/remember", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
        host: "www.dstrike.app",
        origin: "https://www.dstrike.app",
      },
    });
    assert.equal(isAllowedSameSiteRequest(iframePost), true);
  });

  it("allows same-origin GET from inside a cross-site iframe when Referer matches host", () => {
    const iframeGet = new Request("https://www.dstrike.app/_serverFn/session", {
      method: "GET",
      headers: {
        "sec-fetch-site": "cross-site",
        "x-forwarded-host": "www.dstrike.app",
        referer: "https://www.dstrike.app/noctis",
      },
    });
    assert.equal(isAllowedSameSiteRequest(iframeGet), true);
  });

  it("blocks scripted cross-site attacker POST", () => {
    const attackerPost = new Request("https://www.dstrike.app/_serverFn/remember", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
        host: "www.dstrike.app",
        origin: "https://evil.example",
      },
    });
    assert.equal(isAllowedSameSiteRequest(attackerPost), false);
  });

  it("blocks scripted sibling-tenant same-site attacker POST", () => {
    const siblingPost = new Request("https://app.grok.me/_serverFn/remember", {
      method: "POST",
      headers: {
        "sec-fetch-site": "same-site",
        host: "app.grok.me",
        origin: "https://evil.grok.me",
      },
    });
    assert.equal(isAllowedSameSiteRequest(siblingPost), false);
  });

  it("blocks cross-site POST when Origin is missing even if Referer matches", () => {
    const spoofedGet = new Request("https://www.dstrike.app/_serverFn/mutate", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
        host: "www.dstrike.app",
        referer: "https://www.dstrike.app/noctis",
      },
    });
    assert.equal(isAllowedSameSiteRequest(spoofedGet), false);
  });
});
