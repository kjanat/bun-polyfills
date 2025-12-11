// Synced from: bun/test/js/bun/util/main-worker-file.js
import { isMainThread } from "bun";

console.log("isMainThread", isMainThread);

if (isMainThread) {
  const worker = new Worker(import.meta.url);
  const { promise, resolve } = Promise.withResolvers();

  worker.addEventListener("open", () => {
    resolve();
  });

  await promise;
}
