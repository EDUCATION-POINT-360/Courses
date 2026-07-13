const CACHE_NAME = 'edu-point-v1';
const ASSETS = [
    '/',
    '/index.html'
];

// Install Event
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

// Fetch Event (Offline Support)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});

// Push Notification Listener
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: "Education Point", message: "New Update!" };
    
    const options = {
        body: data.message || data.body,
        icon: 'https://i.ibb.co/d44ds7rw/1783870808728.png',
        badge: 'https://i.ibb.co/d44ds7rw/1783870808728.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
