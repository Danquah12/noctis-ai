import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const voipReady = createServerFn({ method: "GET" }).handler(async () => {
  const { voipStatus } = await import("@/lib/voip.server");
  return voipStatus();
});

export const voipToken = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { mintVoiceToken, voipConfigured } = await import("@/lib/voip.server");
    if (!voipConfigured()) throw new Error("Direct carrier gateway (Twilio) is not configured yet.");
    const token = mintVoiceToken(context.userId);
    if (!token) throw new Error("Direct carrier gateway (Twilio) is not configured yet.");
    return { token };
  });
