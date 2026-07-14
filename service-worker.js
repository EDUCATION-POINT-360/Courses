self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

// پش نوٹیفکیشن ریسیو کرنے کے لیے
self.addEventListener('push', function(event) {
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || "Education Point", {
            body: data.message,
            icon: 'https://i.ibb.co/d44ds7rw/1783870808728.png',
            badge: 'https://i.ibb.co/d44ds7rw/1783870808728.png'
        })
    );
});
