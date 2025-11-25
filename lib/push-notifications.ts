const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
const primaryKey = process.env.PUSHER_BEAMS_PRIMARY_KEY;
const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type PublishParams = {
  interests: string[];
  title: string;
  body: string;
  path?: string;
  data?: Record<string, string>;
};

type PublishResult =
  | { ok: true }
  | { ok: false; reason: string; status?: number };

export async function publishBeamsNotification({
  interests,
  title,
  body,
  path,
  data,
}: PublishParams): Promise<PublishResult> {
  if (!instanceId || !primaryKey) {
    const reason = "Pusher Beams credentials are missing. Skipping publish.";
    console.warn(reason);
    return { ok: false, reason };
  }

  const endpoint = `https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}/publishes/interests`;
  const payload = {
    interests,
    web: {
      notification: {
        title,
        body,
        deep_link: path ? `${appBaseUrl}${path}` : undefined,
      },
      data,
    },
  };

  console.info("[Beams] Publishing notification", {
    interests,
    title,
    path,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${primaryKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error("[Beams] Publish failed", {
        status: response.status,
        errorMessage,
      });
      return {
        ok: false,
        reason: errorMessage,
        status: response.status,
      };
    }

    console.info("[Beams] Publish succeeded", { interests });
    return { ok: true };
  } catch (error) {
    console.error("[Beams] Publish threw", error);
    return { ok: false, reason: (error as Error).message };
  }
}

export async function notifyUserByClerkId({
  clerkId,
  title,
  body,
  path,
  data,
}: {
  clerkId?: string;
  title: string;
  body: string;
  path?: string;
  data?: Record<string, string>;
}): Promise<PublishResult> {
  if (!clerkId) {
    console.warn("[Beams] Missing clerkId, skipping notification");
    return { ok: false, reason: "Missing clerkId" };
  }

  const result = await publishBeamsNotification({
    interests: [`user-${clerkId}`],
    title,
    body,
    path,
    data,
  });

  if (!result.ok) {
    console.error("[Beams] notifyUserByClerkId failure", {
      clerkId,
      reason: result.reason,
    });
  }

  return result;
}

