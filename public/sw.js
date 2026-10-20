self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "AGA";
  const body = payload.body || "";
  const link = payload.link || "/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/images/logo.png",
      data: { link },
      tag: link,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link =
    event.notification.data && event.notification.data.link
      ? event.notification.data.link
      : "/notifications";
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(self.clients.openWindow(url));
});
