const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline.html" }
});

module.exports = withPWA({
  output: "export",           // <= add this line once
  experimental: {
    typedRoutes: true
  }
});
