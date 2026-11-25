import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/call-room")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          if (url.searchParams.get("vapid") === "1") {
            const { getWorldPushPublicKey } = await import("@/lib/world-call.server");
            const res = await getWorldPushPublicKey();
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          const lookup = (url.searchParams.get("lookup") ?? "").trim();
          if (lookup) {
            const defaultDial = (url.searchParams.get("dial") ?? "").trim() || undefined;
            const { lookupWorldPhone } = await import("@/lib/world-call.server");
            const hit = await lookupWorldPhone(lookup, defaultDial);
            return Response.json(hit, { headers: { "cache-control": "no-store" } });
          }

          const roomId = (url.searchParams.get("roomId") ?? "").trim();
          if (!roomId) {
            return Response.json(
              { ok: false, error: "roomId, lookup, or vapid=1 query parameter is required" },
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

          if (action === "register_phone") {
            const res = await mod.registerWorldPhone({
              phoneE164: String(body.phoneE164 ?? body.phone ?? ""),
              deviceId: String(body.deviceId ?? body.peerId ?? ""),
              displayName: typeof body.displayName === "string" ? body.displayName : undefined,
              countryIso: typeof body.countryIso === "string" ? body.countryIso : undefined,
              defaultDial: typeof body.defaultDial === "string" ? body.defaultDial : undefined,
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "save_push") {
            const res = await mod.saveWorldPushSubscription({
              phoneE164: String(body.phoneE164 ?? ""),
              deviceId: String(body.deviceId ?? ""),
              displayName: typeof body.displayName === "string" ? body.displayName : undefined,
              subscription: body.subscription,
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "lookup_phone") {
            const res = await mod.lookupWorldPhone(
              String(body.phone ?? body.phoneE164 ?? ""),
              typeof body.defaultDial === "string" ? body.defaultDial : undefined,
            );
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "ring_phone") {
            const res = await mod.ringWorldPhone({
              roomId: String(body.roomId ?? ""),
              fromPhoneE164: typeof body.fromPhoneE164 === "string" ? body.fromPhoneE164 : undefined,
              fromName: typeof body.fromName === "string" ? body.fromName : undefined,
              toPhoneE164: String(body.toPhoneE164 ?? body.phoneE164 ?? ""),
              mode: typeof body.mode === "string" ? body.mode : "voice",
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "poll_rings") {
            const res = await mod.pollWorldRings({
              phoneE164: String(body.phoneE164 ?? ""),
              deviceId: typeof body.deviceId === "string" ? body.deviceId : undefined,
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "respond_ring") {
            const res = await mod.respondWorldRing({
              ringId: Number(body.ringId),
              status: String(body.status ?? ""),
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "ring_status") {
            const res = await mod.getWorldRingStatus(Number(body.ringId));
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "ring_group") {
            const res = await mod.ringWorldGroup({
              roomId: String(body.roomId ?? ""),
              groupName: typeof body.groupName === "string" ? body.groupName : undefined,
              fromPhoneE164: typeof body.fromPhoneE164 === "string" ? body.fromPhoneE164 : undefined,
              fromName: typeof body.fromName === "string" ? body.fromName : undefined,
              memberPhones: Array.isArray(body.memberPhones) ? body.memberPhones.map(String) : [],
              mode: typeof body.mode === "string" ? body.mode : "voice",
            });
            return Response.json(res, { headers: { "cache-control": "no-store" } });
          }

          if (action === "cancel_rings") {
            const res = await mod.cancelWorldRings(Array.isArray(body.ringIds) ? body.ringIds : []);
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
