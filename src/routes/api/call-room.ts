import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/call-room")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const roomId = (url.searchParams.get("roomId") ?? "").trim();
          if (!roomId) {
            return Response.json(
              { ok: false, error: "roomId query parameter is required" },
              { status: 400, headers: { "cache-control": "no-store" } },
            );
          }
          const { getWorldCallRoom } = await import("@/lib/world-call.server");
          const room = await getWorldCallRoom(roomId);
          if (!room) {
            return Response.json(
              { ok: true, exists: false },
              { status: 404, headers: { "cache-control": "no-store" } },
            );
          }
          return Response.json(
            { ok: true, ...room },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load call room";
          return Response.json(
            { ok: false, exists: false, error: message },
            { status: 400, headers: { "cache-control": "no-store" } },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body || typeof body !== "object") {
            return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
          }
          const action = String(body.action ?? "").trim();
          const mod = await import("@/lib/world-call.server");

          if (action === "create") {
            const created = await mod.createWorldCallRoom({
              title: typeof body.title === "string" ? body.title : undefined,
              mode: typeof body.mode === "string" ? body.mode : "voice",
              targetE164: typeof body.targetE164 === "string" ? body.targetE164 : undefined,
              hostPeerId: String(body.hostPeerId ?? body.peerId ?? ""),
              hostName: typeof body.hostName === "string" ? body.hostName : typeof body.name === "string" ? body.name : undefined,
            });
            return Response.json({ ok: true, ...created }, { headers: { "cache-control": "no-store" } });
          }

          if (action === "beat") {
            const beat = await mod.beatWorldCallRoom({
              roomId: String(body.roomId ?? ""),
              peerId: String(body.peerId ?? ""),
              name: typeof body.name === "string" ? body.name : undefined,
              cursor: typeof body.cursor === "number" ? body.cursor : Number(body.cursor || 0),
            });
            return Response.json({ ok: true, ...beat }, { headers: { "cache-control": "no-store" } });
          }

          if (action === "signal") {
            const res = await mod.pushWorldCallSignal({
              roomId: String(body.roomId ?? ""),
              fromId: String(body.fromId ?? body.peerId ?? ""),
              toId: String(body.toId ?? ""),
              kind: String(body.kind ?? ""),
              payload: String(body.payload ?? ""),
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "leave") {
            const res = await mod.leaveWorldCallRoom({
              roomId: String(body.roomId ?? ""),
              peerId: String(body.peerId ?? ""),
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Call room request failed";
          return Response.json(
            { ok: false, error: message },
            { status: 400, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
