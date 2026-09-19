const UNLIVO_SW_VERSION = "2026-09-19-04";

self.addEventListener("install", (event) => {
  console.log("UNLIVO service worker installing", UNLIVO_SW_VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log("UNLIVO service worker activated", UNLIVO_SW_VERSION);
    })(),
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const diagnostic = {
        type: "UNLIVO_PUSH_DIAGNOSTIC",
        version: UNLIVO_SW_VERSION,
        receivedAt: new Date().toISOString(),
        stage: "push_received",
        payload: null,
        notification: "pending",
        error: null,
      };

      console.log("UNLIVO PUSH RECEIVED", diagnostic.receivedAt);

      let data = {};

      try {
        data = event.data ? event.data.json() : {};
        diagnostic.stage = "payload_decoded";
        diagnostic.payload = {
          title: data.title || null,
          bodyLength: typeof data.body === "string" ? data.body.length : 0,
          url: data.url || null,
          tag: data.tag || null,
        };
        console.log("UNLIVO PUSH PAYLOAD DECODED", diagnostic.payload);
      } catch (error) {
        data = {
          body: event.data ? event.data.text() : "You have a new UNLIVO update.",
        };
        diagnostic.stage = "payload_text_fallback";
        diagnostic.error = error instanceof Error ? error.message : String(error);
        console.warn("UNLIVO push payload JSON decode failed; using text fallback", diagnostic.error);
      }

      await broadcastDiagnostic(diagnostic);

      try {
        await showUnlivoNotification(data);
        diagnostic.stage = "showNotification_succeeded";
        diagnostic.notification = "shown";
        diagnostic.error = null;
        console.log("UNLIVO PUSH NOTIFICATION SHOWN", diagnostic.receivedAt);
      } catch (error) {
        diagnostic.stage = "showNotification_failed";
        diagnostic.notification = "failed";
        diagnostic.error = error instanceof Error ? error.message : String(error);
        console.error("UNLIVO push notification failed", diagnostic.error);
      }

      await broadcastDiagnostic(diagnostic);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "UNLIVO_TEST_NOTIFICATION") return;

  event.waitUntil(
    (async () => {
      let result;

      try {
        await showUnlivoNotification({
          title: "UNLIVO Test Notification",
          body: "If you can see this, browser notifications are working correctly.",
          url: "/enquiries",
          tag: "unlivo-local-test",
        });

        result = {
          type: "UNLIVO_TEST_NOTIFICATION_RESULT",
          ok: true,
          stage: "showNotification",
          version: UNLIVO_SW_VERSION,
        };
      } catch (error) {
        result = {
          type: "UNLIVO_TEST_NOTIFICATION_RESULT",
          ok: false,
          stage: "showNotification",
          error: error instanceof Error ? error.message : String(error),
          version: UNLIVO_SW_VERSION,
        };
      }

      if (event.source && "postMessage" in event.source) {
        event.source.postMessage(result);
      }
    })(),
  );
});

async function broadcastDiagnostic(message) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage(message);
  }
}

async function showUnlivoNotification(data) {
  const title = data.title || "UNLIVO";
  const body = data.body || "You have a new update.";
  const url = data.url || "/enquiries";
  const tag = data.tag || `unlivo-notification-${Date.now()}`;

  await self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag,
    renotify: true,
    requireInteraction: true,
    data: { url },
    actions: [{ action: "open", title: "View enquiry" }],
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/enquiries",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) =>
        client.url.startsWith(self.location.origin),
      );

      if (existingClient && "navigate" in existingClient && "focus" in existingClient) {
        return existingClient.navigate(targetUrl).then(() => existingClient.focus());
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
