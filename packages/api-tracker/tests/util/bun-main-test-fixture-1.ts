// Synced from: bun/test/js/bun/util/bun-main-test-fixture-1.ts
// this runs with bun:test, but it's not named .test.ts because it is meant to be run in CI by bun-main.test.ts, not on its own
// this override should not persist once we start running bun-main-test-fixture-2.ts
// biome-ignore lint/suspicious/noExplicitAny: testing property override
(Bun as any).main = "foo";
