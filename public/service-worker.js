// sw.js - Service Worker script

// The "install" event is triggered when the service worker is installed.
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  // You can add caching logic here if needed (optional)
  self.skipWaiting(); // Forces the waiting service worker to become active immediately
});

// The "activate" event is triggered when the service worker becomes active.
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim()); // Take control of all clients (pages)
});

// The "fetch" event listens for network requests made by the client.
// Here you can handle requests, e.g., cache responses for offline use.
// self.addEventListener('fetch', (event) => {
//   event.respondWith(
//     fetch(event.request)
//       .catch(() => caches.match(event.request)) // Fallback to cache if offline
//   );
// });


self.addEventListener('push', function (event) {

  // Function to remove HTML tags from a string
  function stripHtmlTags(input) {
    return input.replace(/<[^>]*>/g, '');  // This regex removes everything between < and >, including the tags
  }

  // Parse the incoming push data from the event
  let notification = event.data ? event.data.json() : {};  // Safely parse the incoming data
  // Set up notification options
  let options = {
    body: stripHtmlTags(notification.body) || 'You have a new message!',  // Use notification body or fallback text
    icon: notification.icon || '/images/favicon.png',     // Use notification icon or default icon
    data: notification.data
    //badge: '/images/badge.png',                           // Optional: You can customize the badge here
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notification.title || 'New Notification', options)  // Use notification title or default title
  );
});



// Notification click event listener
self.addEventListener('notificationclick', function (event) {
  event.notification.close();  // Close the notification when clicked
  console.log(event.notification.data.redirectUrl);
  event.waitUntil(
    clients.openWindow(event.notification?.data?.redirectUrl || location.origin + '/users/notifications') // Redirect to your website on click
  );
});
