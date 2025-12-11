// Synced from: bun/test/js/bun/util/sleep-4ever.js
const sleep = parseFloat(process.argv.at(-1));
console.log("Sleeping for", sleep, "ms");
await Bun.sleep(sleep);
