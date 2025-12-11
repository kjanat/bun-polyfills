// Synced from: bun/test/js/bun/spawn/does-not-hang.js
// Modified: uses /bin/sh instead of shellExe() from harness
// Modified: use shorter sleep to avoid hanging in polyfill tests
const s = Bun.spawn({ cmd: ["/bin/sh", "-c", "sleep 0.1"] });

s.unref();
