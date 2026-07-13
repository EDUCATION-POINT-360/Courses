self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Education Point Update";
    const options = {
        body: data.body || "New content available!",
        icon: "https://i.ibb.co/d44ds7rw/1783870808728.png",
        badge: "https://i.ibb.co/d44ds7rw/1783870808728.png",
        vibrate: [200, 100, 200]
    };
    event.waitUntil(self.registration.showNotification(title, options));
});
