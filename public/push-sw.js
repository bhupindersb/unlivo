const UNLIVO_SW_VERSION = "2026-09-19-02";

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
      let data = {};

      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {
          body: event.data ? event.data.text() : "You have a new UNLIVO update.",
        };
      }

      try {
        await showUnlivoNotification(data);
      } catch (error) {
        console.error("UNLIVO push notification failed", error);
      }
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

async function showUnlivoNotification(data) {
  const title = data.title || "UNLIVO";
  const body = data.body || "You have a new update.";
  const url = data.url || "/enquiries";
  const tag = data.tag || `unlivo-notification-${Date.now()}`;

  await self.registration.showNotification(title, {
    body,
    tag,
    renotify: true,
    requireInteraction: true,
    data: { url },
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
      for (const client of clients) {
        if ("navigate" in client && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
