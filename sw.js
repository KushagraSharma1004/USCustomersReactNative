// sw.js
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
});

self.addEventListener('fetch', (event) => {
    // You can add caching logic here
    console.log('Service Worker fetching:', event.request.url);
});