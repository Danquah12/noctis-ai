import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

function jsonOut(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { ...CORS_HEADERS, "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/connect")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = (url.searchParams.get("action") ?? "bootstrap").trim();
          const mod = await import("@/lib/vibe-connect.server");

          if (action === "flags") {
            return jsonOut({ ok: true, flags: await mod.getFlags() });
          }
          if (action === "bootstrap") {
            const actorId = url.searchParams.get("actorId") ?? "";
            const phoneE164 = url.searchParams.get("phoneE164") ?? "";
            return jsonOut(await mod.bootstrapConnect(actorId, phoneE164));
          }
          if (action === "messages") {
            const threadId = url.searchParams.get("threadId") ?? "";
            const actorId = url.searchParams.get("actorId") ?? "";
            const search = url.searchParams.get("search") ?? "";
            return jsonOut(await mod.listMessages({ threadId, actorId, search }));
          }
          if (action === "tasks") {
            const threadId = url.searchParams.get("threadId") ?? "";
            return jsonOut({ ok: true, tasks: await mod.listTasks(threadId) });
          }
          if (action === "statuses") {
            return jsonOut({ ok: true, statuses: await mod.listStatuses() });
          }
          if (action === "communities") {
            return jsonOut({ ok: true, communities: await mod.listCommunities() });
          }
          if (action === "channels") {
            return jsonOut({ ok: true, channels: await mod.listChannels() });
          }
          if (action === "businesses") {
            return jsonOut({ ok: true, ...(await mod.listBusinesses()) });
          }
          if (action === "devices") {
            const actorId = url.searchParams.get("actorId") ?? "";
            return jsonOut({ ok: true, devices: await mod.listDevices(actorId) });
          }
          if (action === "blocks") {
            const actorId = url.searchParams.get("actorId") ?? "";
            return jsonOut({ ok: true, blocks: await mod.listBlocks(actorId) });
          }
          if (action === "call_history") {
            const phoneE164 = url.searchParams.get("phoneE164") ?? "";
            return jsonOut({ ok: true, callHistory: await mod.listCallHistory(phoneE164) });
          }
          if (action === "admin_metrics") {
            return jsonOut(await mod.getAdminTelemetry());
          }
          if (action === "export_backup") {
            const actorId = url.searchParams.get("actorId") ?? "";
            return jsonOut({ ok: true, backup: await mod.exportActorBackup(actorId) });
          }

          return jsonOut({ ok: false, error: `Unknown GET action: ${action}` }, 400);
        } catch (err) {
          const status = (err as { status?: number } | null)?.status ?? 400;
          const message = err instanceof Error ? err.message : "Connect GET failed";
          return jsonOut({ ok: false, error: message }, status);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body || typeof body !== "object") {
            return jsonOut({ ok: false, error: "Invalid JSON body" }, 400);
          }
          const action = String(body.action ?? "").trim();
          const mod = await import("@/lib/vibe-connect.server");

          if (action === "register_profile") {
            return jsonOut(
              await mod.registerProfile({
                actorId: String(body.actorId ?? ""),
                phoneE164: typeof body.phoneE164 === "string" ? body.phoneE164 : undefined,
                username: typeof body.username === "string" ? body.username : undefined,
                displayName: typeof body.displayName === "string" ? body.displayName : undefined,
                bio: typeof body.bio === "string" ? body.bio : undefined,
                publicKeyJwk: typeof body.publicKeyJwk === "string" ? body.publicKeyJwk : undefined,
                deviceId: typeof body.deviceId === "string" ? body.deviceId : undefined,
                deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel : undefined,
              }),
            );
          }
          if (action === "update_privacy") {
            return jsonOut(
              await mod.updatePrivacy(
                String(body.actorId ?? ""),
                (body.privacy && typeof body.privacy === "object" ? body.privacy : {}) as Record<string, unknown>,
              ),
            );
          }
          if (action === "register_device") {
            return jsonOut(
              await mod.registerDevice({
                actorId: String(body.actorId ?? ""),
                deviceId: String(body.deviceId ?? ""),
                label: typeof body.label === "string" ? body.label : undefined,
                platform: typeof body.platform === "string" ? body.platform : undefined,
              }),
            );
          }
          if (action === "revoke_device") {
            return jsonOut(await mod.revokeDevice(String(body.actorId ?? ""), String(body.deviceId ?? "")));
          }
          if (action === "create_thread") {
            return jsonOut(
              await mod.createThread({
                id: typeof body.id === "string" ? body.id : undefined,
                kind: typeof body.kind === "string" ? body.kind : undefined,
                title: typeof body.title === "string" ? body.title : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
                communityId: typeof body.communityId === "string" ? body.communityId : undefined,
                e2eeEnabled: typeof body.e2eeEnabled === "boolean" ? body.e2eeEnabled : undefined,
                disappearingTtl: typeof body.disappearingTtl === "string" ? body.disappearingTtl : undefined,
                adminOnlyPost: typeof body.adminOnlyPost === "boolean" ? body.adminOnlyPost : undefined,
                requireApproval: typeof body.requireApproval === "boolean" ? body.requireApproval : undefined,
                createdBy: String(body.createdBy ?? ""),
                members: Array.isArray(body.members) ? (body.members as string[]) : undefined,
              }),
            );
          }
          if (action === "join_invite") {
            return jsonOut(await mod.joinByInvite(String(body.inviteCode ?? ""), String(body.actorId ?? "")));
          }
          if (action === "update_thread") {
            return jsonOut(
              await mod.updateThread({
                threadId: String(body.threadId ?? ""),
                actorId: String(body.actorId ?? ""),
                title: typeof body.title === "string" ? body.title : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
                disappearingTtl: typeof body.disappearingTtl === "string" ? body.disappearingTtl : undefined,
                adminOnlyPost: typeof body.adminOnlyPost === "boolean" ? body.adminOnlyPost : undefined,
                requireApproval: typeof body.requireApproval === "boolean" ? body.requireApproval : undefined,
                e2eeEnabled: typeof body.e2eeEnabled === "boolean" ? body.e2eeEnabled : undefined,
                toggleArchive: Boolean(body.toggleArchive),
                togglePin: Boolean(body.togglePin),
                toggleFavorite: Boolean(body.toggleFavorite),
              }),
            );
          }
          if (action === "update_shared_note") {
            return jsonOut(
              await mod.updateSharedNote(
                String(body.threadId ?? ""),
                String(body.actorId ?? ""),
                String(body.sharedNote ?? ""),
              ),
            );
          }
          if (action === "approve_member") {
            return jsonOut(
              await mod.approveMember({
                threadId: String(body.threadId ?? ""),
                adminId: String(body.adminId ?? ""),
                targetActorId: String(body.targetActorId ?? ""),
                approve: Boolean(body.approve),
              }),
            );
          }
          if (action === "send_message") {
            return jsonOut(
              await mod.sendMessage({
                threadId: String(body.threadId ?? ""),
                clientMsgId: typeof body.clientMsgId === "string" ? body.clientMsgId : undefined,
                senderId: String(body.senderId ?? ""),
                senderName: typeof body.senderName === "string" ? body.senderName : undefined,
                msgType: typeof body.msgType === "string" ? body.msgType : undefined,
                body: typeof body.body === "string" ? body.body : undefined,
                encrypted: Boolean(body.encrypted),
                ciphertext: typeof body.ciphertext === "string" ? body.ciphertext : undefined,
                mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
                mediaName: typeof body.mediaName === "string" ? body.mediaName : undefined,
                mediaMime: typeof body.mediaMime === "string" ? body.mediaMime : undefined,
                viewOnce: Boolean(body.viewOnce),
                replyToId: typeof body.replyToId === "number" ? body.replyToId : null,
                forwarded: Boolean(body.forwarded),
                deliverAt: typeof body.deliverAt === "string" ? body.deliverAt : null,
                meta:
                  body.meta && typeof body.meta === "object"
                    ? (body.meta as Record<string, unknown>)
                    : null,
              }),
            );
          }
          if (action === "edit_message") {
            return jsonOut(
              await mod.editMessage({
                messageId: Number(body.messageId),
                actorId: String(body.actorId ?? ""),
                body: String(body.body ?? ""),
                encrypted: Boolean(body.encrypted),
                ciphertext: typeof body.ciphertext === "string" ? body.ciphertext : undefined,
              }),
            );
          }
          if (action === "delete_message") {
            return jsonOut(
              await mod.deleteMessage({
                messageId: Number(body.messageId),
                actorId: String(body.actorId ?? ""),
                forEveryone: Boolean(body.forEveryone),
              }),
            );
          }
          if (action === "react_message") {
            return jsonOut(
              await mod.reactMessage({
                messageId: Number(body.messageId),
                actorId: String(body.actorId ?? ""),
                emoji: String(body.emoji ?? ""),
              }),
            );
          }
          if (action === "toggle_star") {
            return jsonOut(await mod.toggleStarMessage(Number(body.messageId), String(body.actorId ?? "")));
          }
          if (action === "toggle_pin") {
            return jsonOut(await mod.togglePinMessage(Number(body.messageId)));
          }
          if (action === "mark_read") {
            return jsonOut(await mod.markThreadRead(String(body.threadId ?? ""), String(body.actorId ?? "")));
          }
          if (action === "mark_view_once") {
            return jsonOut(await mod.markViewOnce(Number(body.messageId), String(body.actorId ?? "")));
          }
          if (action === "set_presence") {
            return jsonOut(
              await mod.setPresence({
                threadId: String(body.threadId ?? ""),
                actorId: String(body.actorId ?? ""),
                actorName: typeof body.actorName === "string" ? body.actorName : undefined,
                state: String(body.state ?? "online"),
              }),
            );
          }
          if (action === "create_task") {
            return jsonOut(
              await mod.createTask({
                threadId: String(body.threadId ?? ""),
                title: String(body.title ?? ""),
                assignee: typeof body.assignee === "string" ? body.assignee : undefined,
                dueAt: typeof body.dueAt === "string" ? body.dueAt : undefined,
                sourceMsgId: typeof body.sourceMsgId === "number" ? body.sourceMsgId : null,
                createdBy: String(body.createdBy ?? ""),
              }),
            );
          }
          if (action === "update_task") {
            return jsonOut(await mod.updateTaskStatus(String(body.taskId ?? ""), String(body.status ?? "done")));
          }
          if (action === "delete_task") {
            return jsonOut(await mod.deleteTask(String(body.taskId ?? "")));
          }
          if (action === "save_call_notes") {
            return jsonOut(
              await mod.saveCallNotes({
                actorId: String(body.actorId ?? ""),
                actorName: typeof body.actorName === "string" ? body.actorName : undefined,
                roomId: typeof body.roomId === "string" ? body.roomId : undefined,
                title: typeof body.title === "string" ? body.title : undefined,
                notes: String(body.notes ?? ""),
              }),
            );
          }
          if (action === "create_poll") {
            return jsonOut(
              await mod.createPoll({
                threadId: String(body.threadId ?? ""),
                question: String(body.question ?? ""),
                options: Array.isArray(body.options) ? (body.options as string[]) : [],
                createdBy: String(body.createdBy ?? ""),
              }),
            );
          }
          if (action === "vote_poll") {
            return jsonOut(
              await mod.votePoll(
                String(body.pollId ?? ""),
                String(body.actorId ?? ""),
                Number(body.optionIndex ?? 0),
              ),
            );
          }
          if (action === "create_event") {
            return jsonOut(
              await mod.createEvent({
                threadId: String(body.threadId ?? ""),
                title: String(body.title ?? ""),
                startsAt: String(body.startsAt ?? ""),
                location: typeof body.location === "string" ? body.location : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
                createdBy: String(body.createdBy ?? ""),
              }),
            );
          }
          if (action === "rsvp_event") {
            return jsonOut(
              await mod.rsvpEvent(
                String(body.eventId ?? ""),
                String(body.actorId ?? ""),
                String(body.status ?? "going"),
              ),
            );
          }
          if (action === "create_community") {
            return jsonOut(
              await mod.createCommunity({
                name: String(body.name ?? ""),
                description: typeof body.description === "string" ? body.description : undefined,
                createdBy: String(body.createdBy ?? ""),
              }),
            );
          }
          if (action === "create_status") {
            return jsonOut(
              await mod.createStatus({
                actorId: String(body.actorId ?? ""),
                actorName: typeof body.actorName === "string" ? body.actorName : undefined,
                kind: typeof body.kind === "string" ? body.kind : undefined,
                content: String(body.content ?? ""),
                mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
                bgColor: typeof body.bgColor === "string" ? body.bgColor : undefined,
                privacy: typeof body.privacy === "string" ? body.privacy : undefined,
              }),
            );
          }
          if (action === "view_status") {
            return jsonOut(await mod.viewStatus(String(body.statusId ?? ""), String(body.actorId ?? "")));
          }
          if (action === "react_status") {
            return jsonOut(
              await mod.reactStatus(
                String(body.statusId ?? ""),
                String(body.actorId ?? ""),
                String(body.emoji ?? "❤️"),
              ),
            );
          }
          if (action === "create_channel") {
            return jsonOut(
              await mod.createChannel({
                name: String(body.name ?? ""),
                handle: typeof body.handle === "string" ? body.handle : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
                verified: Boolean(body.verified),
                premium: Boolean(body.premium),
                ownerId: String(body.ownerId ?? ""),
              }),
            );
          }
          if (action === "subscribe_channel") {
            return jsonOut(await mod.subscribeChannel(String(body.channelId ?? ""), String(body.actorId ?? "")));
          }
          if (action === "post_channel") {
            return jsonOut(
              await mod.postChannel({
                channelId: String(body.channelId ?? ""),
                authorName: String(body.authorName ?? ""),
                body: String(body.body ?? ""),
                mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
              }),
            );
          }
          if (action === "react_channel_post") {
            return jsonOut(
              await mod.reactChannelPost(
                Number(body.postId),
                String(body.emoji ?? "👍"),
                String(body.actorId ?? ""),
              ),
            );
          }
          if (action === "upsert_business") {
            return jsonOut(
              await mod.upsertBusiness({
                id: typeof body.id === "string" ? body.id : undefined,
                ownerId: String(body.ownerId ?? ""),
                name: String(body.name ?? ""),
                category: typeof body.category === "string" ? body.category : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
                hoursText: typeof body.hoursText === "string" ? body.hoursText : undefined,
                greetingMsg: typeof body.greetingMsg === "string" ? body.greetingMsg : undefined,
                awayMsg: typeof body.awayMsg === "string" ? body.awayMsg : undefined,
                quickReplies: Array.isArray(body.quickReplies) ? (body.quickReplies as string[]) : undefined,
                teamAgents: Array.isArray(body.teamAgents) ? (body.teamAgents as string[]) : undefined,
              }),
            );
          }
          if (action === "add_product") {
            return jsonOut(
              await mod.addProduct({
                businessId: String(body.businessId ?? ""),
                name: String(body.name ?? ""),
                priceCents: Number(body.priceCents ?? 0),
                currency: typeof body.currency === "string" ? body.currency : undefined,
                description: typeof body.description === "string" ? body.description : undefined,
              }),
            );
          }
          if (action === "create_order") {
            return jsonOut(
              await mod.createOrder({
                businessId: String(body.businessId ?? ""),
                customerId: String(body.customerId ?? ""),
                customerName: typeof body.customerName === "string" ? body.customerName : undefined,
                items: Array.isArray(body.items)
                  ? (body.items as { productId: string; name: string; qty: number; priceCents: number }[])
                  : [],
                appointmentAt: typeof body.appointmentAt === "string" ? body.appointmentAt : undefined,
                notes: typeof body.notes === "string" ? body.notes : undefined,
              }),
            );
          }
          if (action === "update_order") {
            return jsonOut(
              await mod.updateOrder({
                orderId: String(body.orderId ?? ""),
                status: typeof body.status === "string" ? body.status : undefined,
                assignedAgent: typeof body.assignedAgent === "string" ? body.assignedAgent : undefined,
                customerLabel: typeof body.customerLabel === "string" ? body.customerLabel : undefined,
              }),
            );
          }
          if (action === "block_user") {
            return jsonOut(await mod.blockUser(String(body.blockerId ?? ""), String(body.blockedId ?? "")));
          }
          if (action === "unblock_user") {
            return jsonOut(await mod.unblockUser(String(body.blockerId ?? ""), String(body.blockedId ?? "")));
          }
          if (action === "report_user") {
            return jsonOut(
              await mod.reportUser({
                reporterId: String(body.reporterId ?? ""),
                targetId: String(body.targetId ?? ""),
                reason: String(body.reason ?? ""),
              }),
            );
          }
          if (action === "set_flag") {
            return jsonOut(await mod.setFlag(String(body.flagKey ?? ""), Boolean(body.enabled)));
          }

          return jsonOut({ ok: false, error: `Unknown POST action: ${action}` }, 400);
        } catch (err) {
          const status = (err as { status?: number } | null)?.status ?? 400;
          const code = (err as { code?: string } | null)?.code;
          const message = err instanceof Error ? err.message : "Connect POST failed";
          return jsonOut({ ok: false, error: message, code, blocked: code === "USER_BLOCKED" }, status);
        }
      },
    },
  },
});
