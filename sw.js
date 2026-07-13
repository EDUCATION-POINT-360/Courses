const CACHE_NAME = 'edu-point-v1';
const ASSETS = [
    '/',
    '/index.html'
];

// Install Event - Caching App Shell
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Cleaning Up Old Caches & Taking Control
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

// Fetch Event - Cache First, Fallback to Network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});

// Push Notification Listener
self.addEventListener('push', (event) => {
    let data = { title: "Education Point", message: "New Update!" };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (err) {
            // Fallback if the payload is plain text instead of JSON
            data = { title: "Education Point", message: event.data.text() };
        }
    }
    
    const options = {
        body: data.message || data.body || "New Update!",
        icon: 'https://i.ibb.co/d44ds7rw/1783870808728.png',
        badge: 'https://i.ibb.co/d44ds7rw/1783870808728.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/' // Opens the home page when clicked
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "Education Point", options)
    );
});

// Notification Click Event Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If a tab is already open, focus it
            for (let client of windowClients) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new tab
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
