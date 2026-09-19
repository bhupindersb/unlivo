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

      await showUnlivoNotification(data);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "UNLIVO_TEST_NOTIFICATION") return;

  event.waitUntil(
    showUnlivoNotification({
      title: "UNLIVO Test Notification",
      body: "If you can see this, browser notifications are working correctly.",
      url: "/enquiries",
      tag: "unlivo-local-test",
    }),
  );
});

async function showUnlivoNotification(data) {
  const title = data.title || "UNLIVO";
  const body = data.body || "You have a new update.";
  const url = data.url || "/enquiries";
  const tag = data.tag || `unlivo-notification-${Date.now()}`;

  try {
    await self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      data: { url },
    });
  } catch (error) {
    console.error("UNLIVO notification display failed", error);
  }
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
