# Bun API Coverage Report

Generated: 12/11/2025, 4:54:03 PM | @types/bun: 1.3.4

## Summary

| Status                         | Count   | %   |
| ------------------------------ | ------- | --- |
| :white_check_mark: Implemented | 11      | 2%  |
| :yellow_circle: Partial        | 27      | 6%  |
| :construction: Stub            | 0       | 0%  |
| :x: Not Started                | 414     | 92% |
| **Total**                      | **452** | -   |

**Overall Progress: 5%**

## Progress by Category

### Process (2/7 - 64%)

| API             | Status                         | Notes                                                                                                                                                                                                    |
| --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Bun.argv`      | :white_check_mark: Implemented |                                                                                                                                                                                                          |
| `Bun.main`      | :white_check_mark: Implemented |                                                                                                                                                                                                          |
| `Bun.env`       | :yellow_circle: Partial        | Direct pass-through to process.env                                                                                                                                                                       |
| `Bun.which`     | :yellow_circle: Partial        | Signature mismatch: Bun="(command: string, options?: WhichOptions \| undefined) => string \| null" vs Polyfill="(cmd: string, options?: { PATH?: string \| undefined; } \| undefined) => string \| null" |
| `Bun.spawn`     | :yellow_circle: Partial        | Core spawn functionality working via node:child_process                                                                                                                                                  |
| `Bun.spawnSync` | :yellow_circle: Partial        | Core spawnSync functionality working via node:child_process                                                                                                                                              |
| `Bun.$`         | :yellow_circle: Partial        | Uses zx as backend                                                                                                                                                                                       |

### Module (2/5 - 60%)

| API                 | Status                         | Notes                    |
| ------------------- | ------------------------------ | ------------------------ |
| `Bun.pathToFileURL` | :white_check_mark: Implemented |                          |
| `Bun.fileURLToPath` | :white_check_mark: Implemented |                          |
| `Bun.resolveSync`   | :yellow_circle: Partial        | Uses require.resolve     |
| `Bun.resolve`       | :yellow_circle: Partial        | Uses import.meta.resolve |
| `Loader.resolve`    | :x: Not Started                |                          |

### Compression (0/8 - 25%)

| API                      | Status                  | Notes                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Bun.deflateSync`        | :yellow_circle: Partial | Signature mismatch: Bun="(data: string \| ArrayBuffer \| Uint8Array<ArrayBuffer>, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions \| undefined) => Uint8Array<...>" vs Polyfill="(input: string \| ArrayBuffer \| Uint8Array<ArrayBufferLike> \| ArrayBufferView<ArrayBufferLike>, options?: { ...; } \| undefined) => Uint8Array<...>" |
| `Bun.gzipSync`           | :yellow_circle: Partial | Signature mismatch: Bun="(data: string \| ArrayBuffer \| Uint8Array<ArrayBuffer>, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions \| undefined) => Uint8Array<...>" vs Polyfill="(input: string \| ArrayBuffer \| Uint8Array<ArrayBufferLike> \| ArrayBufferView<ArrayBufferLike>, options?: { ...; } \| undefined) => Uint8Array<...>" |
| `Bun.inflateSync`        | :yellow_circle: Partial | Signature mismatch: Bun="(data: string \| ArrayBuffer \| Uint8Array<ArrayBuffer>, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions \| undefined) => Uint8Array<...>" vs Polyfill="(input: ArrayBuffer \| Uint8Array<ArrayBufferLike> \| ArrayBufferView<ArrayBufferLike>, options?: { ...; } \| undefined) => Uint8Array<...>"           |
| `Bun.gunzipSync`         | :yellow_circle: Partial | Signature mismatch: Bun="(data: string \| ArrayBuffer \| Uint8Array<ArrayBuffer>, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions \| undefined) => Uint8Array<...>" vs Polyfill="(input: ArrayBuffer \| Uint8Array<ArrayBufferLike> \| ArrayBufferView<ArrayBufferLike>, options?: { ...; } \| undefined) => Uint8Array<...>"           |
| `Bun.zstdCompressSync`   | :x: Not Started         |                                                                                                                                                                                                                                                                                                                                                          |
| `Bun.zstdCompress`       | :x: Not Started         |                                                                                                                                                                                                                                                                                                                                                          |
| `Bun.zstdDecompressSync` | :x: Not Started         |                                                                                                                                                                                                                                                                                                                                                          |
| `Bun.zstdDecompress`     | :x: Not Started         |                                                                                                                                                                                                                                                                                                                                                          |

### Utility (7/63 - 18%)

| API                                | Status                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Bun.stripANSI`                    | :white_check_mark: Implemented |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.escapeHTML`                   | :white_check_mark: Implemented |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.deepMatch`                    | :white_check_mark: Implemented |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.sleepSync`                    | :white_check_mark: Implemented |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.isMainThread`                 | :white_check_mark: Implemented |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.version`                      | :white_check_mark: Implemented | Returns polyfill version, not actual Bun version                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Bun.revision`                     | :white_check_mark: Implemented | Returns 'polyfill' as revision                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Bun.stringWidth`                  | :yellow_circle: Partial        | Signature mismatch: Bun="(input: string, options?: StringWidthOptions \| undefined) => number" vs Polyfill="(input: string) => number"                                                                                                                                                                                                                                                                                                                                                          |
| `Bun.concatArrayBuffers`           | :yellow_circle: Partial        | Signature mismatch: Bun="{ (buffers: (ArrayBufferLike \| ArrayBufferView<ArrayBufferLike>)[], maxLength?: number \| undefined): ArrayBuffer; (buffers: (ArrayBufferLike \| ArrayBufferView<...>)[], maxLength: number, asUint8Array: false): ArrayBuffer; (buffers: (ArrayBufferLike \| ArrayBufferView<...>)[], maxLength: number, asUint8Array: true): U..." vs Polyfill="(buffers: (ArrayBufferLike \| ArrayBufferView<ArrayBufferLike>)[], maxLength?: number \| undefined) => ArrayBuffer" |
| `Bun.peek`                         | :yellow_circle: Partial        | Simplified implementation - can't synchronously check promise state in userland JS                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Bun.deepEquals`                   | :yellow_circle: Partial        | Signature mismatch: Bun="(a: any, b: any, strict?: boolean \| undefined) => boolean" vs Polyfill="(a: unknown, b: unknown, strict?: boolean \| undefined) => boolean"                                                                                                                                                                                                                                                                                                                           |
| `Bun.inspect`                      | :yellow_circle: Partial        | Signature mismatch: Bun="typeof inspect" vs Polyfill="(arg: unknown, options?: { depth?: number \| undefined; colors?: boolean \| undefined; } \| undefined) => string"                                                                                                                                                                                                                                                                                                                         |
| `Bun.gc`                           | :yellow_circle: Partial        | Signature mismatch: Bun="(force?: boolean \| undefined) => void" vs Polyfill="(full?: boolean \| undefined) => void"                                                                                                                                                                                                                                                                                                                                                                            |
| `Bun.nanoseconds`                  | :yellow_circle: Partial        | Signature mismatch: Bun="() => number" vs Polyfill="() => bigint"                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Bun.sleep`                        | :yellow_circle: Partial        | Signature mismatch: Bun="(ms: number \| Date) => Promise<void>" vs Polyfill="(ms: number) => Promise<void>"                                                                                                                                                                                                                                                                                                                                                                                     |
| `Bun.Glob`                         | :yellow_circle: Partial        | Signature mismatch: Bun="typeof Glob" vs Polyfill="any"                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Bun.readableStreamToArrayBuffer`  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.readableStreamToFormData`     | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.readableStreamToArray`        | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.ArrayBufferSink`              | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.ArrayBufferSink.start`        | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.ArrayBufferSink.flush`        | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.ArrayBufferSink.end`          | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.allocUnsafe`                  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.color`                        | :x: Not Started                | Could be implemented with a color parsing library                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Bun.semver`                       | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.semver.satisfies`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.semver.order`                 | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.enableANSIColors`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.generateHeapSnapshot`         | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.openInEditor`                 | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Glob.scan`                    | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Glob.scanSync`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Glob.match`                   | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie`                       | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.name`                  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.value`                 | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.domain`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.path`                  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.expires`               | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.secure`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.sameSite`              | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.partitioned`           | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.maxAge`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.httpOnly`              | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.isExpired`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.serialize`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.toJSON`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.parse`                 | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.Cookie.from`                  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap`                    | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.get`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.toSetCookieHeaders` | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.has`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.set`                | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.delete`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.toJSON`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.size`               | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.entries`            | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.keys`               | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.values`             | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.forEach`            | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Bun.CookieMap.[Symbol.iterator]`  | :x: Not Started                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Filesystem (0/17 - 15%)

| API                         | Status                  | Notes                                                                    |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `Bun.write`                 | :yellow_circle: Partial | Most data types supported                                                |
| `Bun.file`                  | :yellow_circle: Partial | Core functionality working, uses node:fs                                 |
| `Bun.stdout`                | :yellow_circle: Partial | Signature differs: Bun expects "BunFile", polyfill has "PolyfillBunFile" |
| `Bun.stderr`                | :yellow_circle: Partial | Signature differs: Bun expects "BunFile", polyfill has "PolyfillBunFile" |
| `Bun.stdin`                 | :yellow_circle: Partial | Basic stdin reading works                                                |
| `Bun.ArrayBufferSink.write` | :x: Not Started         |                                                                          |
| `Bun.BunFile.write`         | :x: Not Started         |                                                                          |
| `Bun.embeddedFiles`         | :x: Not Started         |                                                                          |
| `Bun.mmap`                  | :x: Not Started         |                                                                          |
| `Bun.Subprocess.stdin`      | :x: Not Started         |                                                                          |
| `Bun.Subprocess.stdout`     | :x: Not Started         |                                                                          |
| `Bun.Subprocess.stderr`     | :x: Not Started         |                                                                          |
| `Bun.SyncSubprocess.stdout` | :x: Not Started         |                                                                          |
| `Bun.SyncSubprocess.stderr` | :x: Not Started         |                                                                          |
| `Bun.FileSink.write`        | :x: Not Started         |                                                                          |
| `Bun.S3Client.file`         | :x: Not Started         |                                                                          |
| `Bun.S3Client.write`        | :x: Not Started         |                                                                          |

### Parsing (0/5 - 10%)

| API                  | Status                  | Notes                                                   |
| -------------------- | ----------------------- | ------------------------------------------------------- |
| `Bun.TOML`           | :yellow_circle: Partial | Signature mismatch: Bun="typeof TOML" vs Polyfill="any" |
| `Bun.TOML.parse`     | :x: Not Started         |                                                         |
| `Bun.YAML`           | :x: Not Started         |                                                         |
| `Bun.YAML.parse`     | :x: Not Started         |                                                         |
| `Bun.YAML.stringify` | :x: Not Started         |                                                         |

### Crypto (0/32 - 2%)

| API                            | Status                  | Notes                                               |
| ------------------------------ | ----------------------- | --------------------------------------------------- |
| `Bun.hash`                     | :yellow_circle: Partial | Partial - some hash algorithms could be implemented |
| `Bun.password`                 | :x: Not Started         | Could be implemented with node:crypto scrypt/argon2 |
| `Bun.password.verify`          | :x: Not Started         |                                                     |
| `Bun.password.hash`            | :x: Not Started         |                                                     |
| `Bun.password.verifySync`      | :x: Not Started         |                                                     |
| `Bun.password.hashSync`        | :x: Not Started         |                                                     |
| `Bun.CryptoHashInterface.hash` | :x: Not Started         |                                                     |
| `Bun.CryptoHasher`             | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.algorithm`   | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.byteLength`  | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.update`      | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.copy`        | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.digest`      | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.hash`        | :x: Not Started         |                                                     |
| `Bun.CryptoHasher.algorithms`  | :x: Not Started         |                                                     |
| `Bun.sha`                      | :x: Not Started         | Could be implemented with node:crypto               |
| `Bun.SHA1`                     | :x: Not Started         |                                                     |
| `Bun.SHA1.byteLength`          | :x: Not Started         |                                                     |
| `Bun.MD5`                      | :x: Not Started         |                                                     |
| `Bun.MD5.byteLength`           | :x: Not Started         |                                                     |
| `Bun.MD4`                      | :x: Not Started         |                                                     |
| `Bun.MD4.byteLength`           | :x: Not Started         |                                                     |
| `Bun.SHA224`                   | :x: Not Started         |                                                     |
| `Bun.SHA224.byteLength`        | :x: Not Started         |                                                     |
| `Bun.SHA512`                   | :x: Not Started         |                                                     |
| `Bun.SHA512.byteLength`        | :x: Not Started         |                                                     |
| `Bun.SHA384`                   | :x: Not Started         |                                                     |
| `Bun.SHA384.byteLength`        | :x: Not Started         |                                                     |
| `Bun.SHA256`                   | :x: Not Started         |                                                     |
| `Bun.SHA256.byteLength`        | :x: Not Started         |                                                     |
| `Bun.SHA512_256`               | :x: Not Started         |                                                     |
| `Bun.SHA512_256.byteLength`    | :x: Not Started         |                                                     |

### Network (0/9 - 0%)

| API                     | Status          | Notes |
| ----------------------- | --------------- | ----- |
| `Bun.dns`               | :x: Not Started |       |
| `Bun.dns.lookup`        | :x: Not Started |       |
| `Bun.dns.prefetch`      | :x: Not Started |       |
| `Bun.dns.getCacheStats` | :x: Not Started |       |
| `Bun.fetch`             | :x: Not Started |       |
| `Bun.connect`           | :x: Not Started |       |
| `Bun.listen`            | :x: Not Started |       |
| `Bun.udpSocket`         | :x: Not Started |       |
| `fetch`                 | :x: Not Started |       |

### Unknown (0/246 - 0%)

| API                                          | Status          | Notes |
| -------------------------------------------- | --------------- | ----- |
| `Bun.BunFile`                                | :x: Not Started |       |
| `Bun.BunFile.slice`                          | :x: Not Started |       |
| `Bun.BunFile.writer`                         | :x: Not Started |       |
| `Bun.BunFile.lastModified`                   | :x: Not Started |       |
| `Bun.BunFile.name`                           | :x: Not Started |       |
| `Bun.BunFile.exists`                         | :x: Not Started |       |
| `Bun.BunFile.unlink`                         | :x: Not Started |       |
| `Bun.BunFile.delete`                         | :x: Not Started |       |
| `Bun.BunFile.stat`                           | :x: Not Started |       |
| `Bun.Build`                                  | :x: Not Started |       |
| `Bun.Password`                               | :x: Not Started |       |
| `Bun.CryptoHashInterface`                    | :x: Not Started |       |
| `Bun.CryptoHashInterface.update`             | :x: Not Started |       |
| `Bun.CryptoHashInterface.digest`             | :x: Not Started |       |
| `Bun.udp`                                    | :x: Not Started |       |
| `Bun.Spawn`                                  | :x: Not Started |       |
| `Bun.Subprocess`                             | :x: Not Started |       |
| `Bun.Subprocess.stdio`                       | :x: Not Started |       |
| `Bun.Subprocess.readable`                    | :x: Not Started |       |
| `Bun.Subprocess.pid`                         | :x: Not Started |       |
| `Bun.Subprocess.exited`                      | :x: Not Started |       |
| `Bun.Subprocess.exitCode`                    | :x: Not Started |       |
| `Bun.Subprocess.signalCode`                  | :x: Not Started |       |
| `Bun.Subprocess.killed`                      | :x: Not Started |       |
| `Bun.Subprocess.kill`                        | :x: Not Started |       |
| `Bun.Subprocess.ref`                         | :x: Not Started |       |
| `Bun.Subprocess.unref`                       | :x: Not Started |       |
| `Bun.Subprocess.send`                        | :x: Not Started |       |
| `Bun.Subprocess.disconnect`                  | :x: Not Started |       |
| `Bun.Subprocess.resourceUsage`               | :x: Not Started |       |
| `Bun.SyncSubprocess`                         | :x: Not Started |       |
| `Bun.SyncSubprocess.exitCode`                | :x: Not Started |       |
| `Bun.SyncSubprocess.success`                 | :x: Not Started |       |
| `Bun.SyncSubprocess.resourceUsage`           | :x: Not Started |       |
| `Bun.SyncSubprocess.signalCode`              | :x: Not Started |       |
| `Bun.SyncSubprocess.exitedDueToTimeout`      | :x: Not Started |       |
| `Bun.SyncSubprocess.exitedDueToMaxBuffer`    | :x: Not Started |       |
| `Bun.SyncSubprocess.pid`                     | :x: Not Started |       |
| `Bun.FileSystemRouter`                       | :x: Not Started |       |
| `Bun.FileSystemRouter.match`                 | :x: Not Started |       |
| `Bun.FileSystemRouter.assetPrefix`           | :x: Not Started |       |
| `Bun.FileSystemRouter.origin`                | :x: Not Started |       |
| `Bun.FileSystemRouter.style`                 | :x: Not Started |       |
| `Bun.FileSystemRouter.routes`                | :x: Not Started |       |
| `Bun.FileSystemRouter.reload`                | :x: Not Started |       |
| `Bun.version_with_sha`                       | :x: Not Started |       |
| `Bun.indexOfLine`                            | :x: Not Started |       |
| `Bun.randomUUIDv7`                           | :x: Not Started |       |
| `Bun.randomUUIDv5`                           | :x: Not Started |       |
| `Bun.redis`                                  | :x: Not Started |       |
| `Bun.FileSink`                               | :x: Not Started |       |
| `Bun.FileSink.flush`                         | :x: Not Started |       |
| `Bun.FileSink.end`                           | :x: Not Started |       |
| `Bun.FileSink.start`                         | :x: Not Started |       |
| `Bun.FileSink.ref`                           | :x: Not Started |       |
| `Bun.FileSink.unref`                         | :x: Not Started |       |
| `HTMLRewriterTypes`                          | :x: Not Started |       |
| `Bun.WebAssembly`                            | :x: Not Started |       |
| `WebAssembly`                                | :x: Not Started |       |
| `WebAssembly.compile`                        | :x: Not Started |       |
| `WebAssembly.compileStreaming`               | :x: Not Started |       |
| `WebAssembly.instantiate`                    | :x: Not Started |       |
| `WebAssembly.instantiateStreaming`           | :x: Not Started |       |
| `WebAssembly.validate`                       | :x: Not Started |       |
| `Bun.Security`                               | :x: Not Started |       |
| `Bun.Statement`                              | :x: Not Started |       |
| `Bun.Statement.all`                          | :x: Not Started |       |
| `Bun.Statement.get`                          | :x: Not Started |       |
| `Bun.Statement.iterate`                      | :x: Not Started |       |
| `Bun.Statement.[Symbol.iterator]`            | :x: Not Started |       |
| `Bun.Statement.run`                          | :x: Not Started |       |
| `Bun.Statement.values`                       | :x: Not Started |       |
| `Bun.Statement.raw`                          | :x: Not Started |       |
| `Bun.Statement.columnNames`                  | :x: Not Started |       |
| `Bun.Statement.paramsCount`                  | :x: Not Started |       |
| `Bun.Statement.columnTypes`                  | :x: Not Started |       |
| `Bun.Statement.declaredTypes`                | :x: Not Started |       |
| `Bun.Statement.finalize`                     | :x: Not Started |       |
| `Bun.Statement.[Symbol.dispose]`             | :x: Not Started |       |
| `Bun.Statement.as`                           | :x: Not Started |       |
| `Bun.Statement.native`                       | :x: Not Started |       |
| `Bun.constants`                              | :x: Not Started |       |
| `Bun.native`                                 | :x: Not Started |       |
| `Bun.SQLiteError`                            | :x: Not Started |       |
| `Bun.SQLiteError.name`                       | :x: Not Started |       |
| `Bun.SQLiteError.errno`                      | :x: Not Started |       |
| `Bun.SQLiteError.code`                       | :x: Not Started |       |
| `Bun.SQLiteError.byteOffset`                 | :x: Not Started |       |
| `Bun.FFIFunctionCallableSymbol`              | :x: Not Started |       |
| `Bun.CFunction`                              | :x: Not Started |       |
| `Bun.linkSymbols`                            | :x: Not Started |       |
| `Bun.read`                                   | :x: Not Started |       |
| `Bun.read.u8`                                | :x: Not Started |       |
| `Bun.read.i8`                                | :x: Not Started |       |
| `Bun.read.u16`                               | :x: Not Started |       |
| `Bun.read.i16`                               | :x: Not Started |       |
| `Bun.read.u32`                               | :x: Not Started |       |
| `Bun.read.i32`                               | :x: Not Started |       |
| `Bun.read.f32`                               | :x: Not Started |       |
| `Bun.read.u64`                               | :x: Not Started |       |
| `Bun.read.i64`                               | :x: Not Started |       |
| `Bun.read.f64`                               | :x: Not Started |       |
| `Bun.read.intptr`                            | :x: Not Started |       |
| `Bun.JSCallback`                             | :x: Not Started |       |
| `Bun.JSCallback.threadsafe`                  | :x: Not Started |       |
| `Bun.JSCallback.close`                       | :x: Not Started |       |
| `Bun.viewSource`                             | :x: Not Started |       |
| `Bun.suffix`                                 | :x: Not Started |       |
| `ReadableStream`                             | :x: Not Started |       |
| `WritableStream`                             | :x: Not Started |       |
| `Worker`                                     | :x: Not Started |       |
| `WebSocket`                                  | :x: Not Started |       |
| `Crypto`                                     | :x: Not Started |       |
| `Crypto.prototype`                           | :x: Not Started |       |
| `crypto`                                     | :x: Not Started |       |
| `TextEncoder`                                | :x: Not Started |       |
| `TextDecoder`                                | :x: Not Started |       |
| `Event`                                      | :x: Not Started |       |
| `Event.prototype`                            | :x: Not Started |       |
| `Event.NONE`                                 | :x: Not Started |       |
| `Event.CAPTURING_PHASE`                      | :x: Not Started |       |
| `Event.AT_TARGET`                            | :x: Not Started |       |
| `Event.BUBBLING_PHASE`                       | :x: Not Started |       |
| `CompressionStream`                          | :x: Not Started |       |
| `DecompressionStream`                        | :x: Not Started |       |
| `EventTarget`                                | :x: Not Started |       |
| `EventTarget.prototype`                      | :x: Not Started |       |
| `File`                                       | :x: Not Started |       |
| `ShadowRealm`                                | :x: Not Started |       |
| `ShadowRealm.prototype`                      | :x: Not Started |       |
| `queueMicrotask`                             | :x: Not Started |       |
| `reportError`                                | :x: Not Started |       |
| `clearInterval`                              | :x: Not Started |       |
| `clearTimeout`                               | :x: Not Started |       |
| `clearImmediate`                             | :x: Not Started |       |
| `setImmediate`                               | :x: Not Started |       |
| `setInterval`                                | :x: Not Started |       |
| `setTimeout`                                 | :x: Not Started |       |
| `addEventListener`                           | :x: Not Started |       |
| `removeEventListener`                        | :x: Not Started |       |
| `ErrorEvent`                                 | :x: Not Started |       |
| `ErrorEvent.prototype`                       | :x: Not Started |       |
| `CloseEvent`                                 | :x: Not Started |       |
| `CloseEvent.prototype`                       | :x: Not Started |       |
| `MessageEvent`                               | :x: Not Started |       |
| `CustomEvent`                                | :x: Not Started |       |
| `CustomEvent.prototype`                      | :x: Not Started |       |
| `Loader`                                     | :x: Not Started |       |
| `Loader.registry`                            | :x: Not Started |       |
| `Loader.dependencyKeysIfEvaluated`           | :x: Not Started |       |
| `ByteLengthQueuingStrategy`                  | :x: Not Started |       |
| `ByteLengthQueuingStrategy.prototype`        | :x: Not Started |       |
| `ReadableStreamDefaultController`            | :x: Not Started |       |
| `ReadableStreamDefaultController.prototype`  | :x: Not Started |       |
| `ReadableStreamDefaultReader`                | :x: Not Started |       |
| `ReadableStreamDefaultReader.prototype`      | :x: Not Started |       |
| `WritableStreamDefaultController`            | :x: Not Started |       |
| `WritableStreamDefaultController.prototype`  | :x: Not Started |       |
| `WritableStreamDefaultWriter`                | :x: Not Started |       |
| `WritableStreamDefaultWriter.prototype`      | :x: Not Started |       |
| `TransformStream`                            | :x: Not Started |       |
| `TransformStream.prototype`                  | :x: Not Started |       |
| `TransformStreamDefaultController`           | :x: Not Started |       |
| `TransformStreamDefaultController.prototype` | :x: Not Started |       |
| `CountQueuingStrategy`                       | :x: Not Started |       |
| `CountQueuingStrategy.prototype`             | :x: Not Started |       |
| `DOMException`                               | :x: Not Started |       |
| `DOMException.prototype`                     | :x: Not Started |       |
| `DOMException.INDEX_SIZE_ERR`                | :x: Not Started |       |
| `DOMException.DOMSTRING_SIZE_ERR`            | :x: Not Started |       |
| `DOMException.HIERARCHY_REQUEST_ERR`         | :x: Not Started |       |
| `DOMException.WRONG_DOCUMENT_ERR`            | :x: Not Started |       |
| `DOMException.INVALID_CHARACTER_ERR`         | :x: Not Started |       |
| `DOMException.NO_DATA_ALLOWED_ERR`           | :x: Not Started |       |
| `DOMException.NO_MODIFICATION_ALLOWED_ERR`   | :x: Not Started |       |
| `DOMException.NOT_FOUND_ERR`                 | :x: Not Started |       |
| `DOMException.NOT_SUPPORTED_ERR`             | :x: Not Started |       |
| `DOMException.INUSE_ATTRIBUTE_ERR`           | :x: Not Started |       |
| `DOMException.INVALID_STATE_ERR`             | :x: Not Started |       |
| `DOMException.SYNTAX_ERR`                    | :x: Not Started |       |
| `DOMException.INVALID_MODIFICATION_ERR`      | :x: Not Started |       |
| `DOMException.NAMESPACE_ERR`                 | :x: Not Started |       |
| `DOMException.INVALID_ACCESS_ERR`            | :x: Not Started |       |
| `DOMException.VALIDATION_ERR`                | :x: Not Started |       |
| `DOMException.TYPE_MISMATCH_ERR`             | :x: Not Started |       |
| `DOMException.SECURITY_ERR`                  | :x: Not Started |       |
| `DOMException.NETWORK_ERR`                   | :x: Not Started |       |
| `DOMException.ABORT_ERR`                     | :x: Not Started |       |
| `DOMException.URL_MISMATCH_ERR`              | :x: Not Started |       |
| `DOMException.QUOTA_EXCEEDED_ERR`            | :x: Not Started |       |
| `DOMException.TIMEOUT_ERR`                   | :x: Not Started |       |
| `DOMException.INVALID_NODE_TYPE_ERR`         | :x: Not Started |       |
| `DOMException.DATA_CLONE_ERR`                | :x: Not Started |       |
| `alert`                                      | :x: Not Started |       |
| `confirm`                                    | :x: Not Started |       |
| `prompt`                                     | :x: Not Started |       |
| `SubtleCrypto`                               | :x: Not Started |       |
| `SubtleCrypto.prototype`                     | :x: Not Started |       |
| `CryptoKey`                                  | :x: Not Started |       |
| `CryptoKey.prototype`                        | :x: Not Started |       |
| `ResolveMessage`                             | :x: Not Started |       |
| `ResolveMessage.name`                        | :x: Not Started |       |
| `ResolveMessage.position`                    | :x: Not Started |       |
| `ResolveMessage.code`                        | :x: Not Started |       |
| `ResolveMessage.message`                     | :x: Not Started |       |
| `ResolveMessage.referrer`                    | :x: Not Started |       |
| `ResolveMessage.specifier`                   | :x: Not Started |       |
| `ResolveMessage.importKind`                  | :x: Not Started |       |
| `ResolveMessage.level`                       | :x: Not Started |       |
| `BuildMessage`                               | :x: Not Started |       |
| `BuildMessage.name`                          | :x: Not Started |       |
| `BuildMessage.position`                      | :x: Not Started |       |
| `BuildMessage.message`                       | :x: Not Started |       |
| `BuildMessage.level`                         | :x: Not Started |       |
| `console`                                    | :x: Not Started |       |
| `require`                                    | :x: Not Started |       |
| `exports`                                    | :x: Not Started |       |
| `module`                                     | :x: Not Started |       |
| `structuredClone`                            | :x: Not Started |       |
| `postMessage`                                | :x: Not Started |       |
| `navigator`                                  | :x: Not Started |       |
| `Blob`                                       | :x: Not Started |       |
| `BroadcastChannel`                           | :x: Not Started |       |
| `URL`                                        | :x: Not Started |       |
| `AbortController`                            | :x: Not Started |       |
| `AbortSignal`                                | :x: Not Started |       |
| `FormData`                                   | :x: Not Started |       |
| `EventSource`                                | :x: Not Started |       |
| `performance`                                | :x: Not Started |       |
| `PerformanceEntry`                           | :x: Not Started |       |
| `PerformanceMark`                            | :x: Not Started |       |
| `PerformanceMeasure`                         | :x: Not Started |       |
| `PerformanceObserver`                        | :x: Not Started |       |
| `PerformanceObserverEntryList`               | :x: Not Started |       |
| `PerformanceResourceTiming`                  | :x: Not Started |       |
| `ReadableByteStreamController`               | :x: Not Started |       |
| `ReadableStreamBYOBReader`                   | :x: Not Started |       |
| `ReadableStreamBYOBRequest`                  | :x: Not Started |       |
| `TextDecoderStream`                          | :x: Not Started |       |
| `TextEncoderStream`                          | :x: Not Started |       |
| `URLSearchParams`                            | :x: Not Started |       |
| `MessageChannel`                             | :x: Not Started |       |
| `MessagePort`                                | :x: Not Started |       |
| `Headers`                                    | :x: Not Started |       |
| `Request`                                    | :x: Not Started |       |
| `Response`                                   | :x: Not Started |       |

### Security (0/7 - 0%)

| API                  | Status          | Notes |
| -------------------- | --------------- | ----- |
| `Bun.CSRF`           | :x: Not Started |       |
| `Bun.CSRF.generate`  | :x: Not Started |       |
| `Bun.CSRF.verify`    | :x: Not Started |       |
| `Bun.secrets`        | :x: Not Started |       |
| `Bun.secrets.get`    | :x: Not Started |       |
| `Bun.secrets.set`    | :x: Not Started |       |
| `Bun.secrets.delete` | :x: Not Started |       |

### Bundler (0/7 - 0%)

| API                            | Status          | Notes |
| ------------------------------ | --------------- | ----- |
| `Bun.Transpiler`               | :x: Not Started |       |
| `Bun.Transpiler.transform`     | :x: Not Started |       |
| `Bun.Transpiler.transformSync` | :x: Not Started |       |
| `Bun.Transpiler.scan`          | :x: Not Started |       |
| `Bun.Transpiler.scanImports`   | :x: Not Started |       |
| `Bun.build`                    | :x: Not Started |       |
| `Bun.plugin`                   | :x: Not Started |       |

### Function toString() {

    [native code]

} (0/3 - 0%)

| API | Status | Notes |
| --- | ------ | ----- |

### Database (0/19 - 0%)

| API                             | Status          | Notes |
| ------------------------------- | --------------- | ----- |
| `Bun.RedisClient`               | :x: Not Started |       |
| `Bun.SQL`                       | :x: Not Started |       |
| `Bun.sql`                       | :x: Not Started |       |
| `Bun.Database`                  | :x: Not Started |       |
| `Bun.Database.open`             | :x: Not Started |       |
| `Bun.Database.run`              | :x: Not Started |       |
| `Bun.Database.exec`             | :x: Not Started |       |
| `Bun.Database.query`            | :x: Not Started |       |
| `Bun.Database.prepare`          | :x: Not Started |       |
| `Bun.Database.close`            | :x: Not Started |       |
| `Bun.Database.filename`         | :x: Not Started |       |
| `Bun.Database.handle`           | :x: Not Started |       |
| `Bun.Database.loadExtension`    | :x: Not Started |       |
| `Bun.Database.setCustomSQLite`  | :x: Not Started |       |
| `Bun.Database.[Symbol.dispose]` | :x: Not Started |       |
| `Bun.Database.transaction`      | :x: Not Started |       |
| `Bun.Database.serialize`        | :x: Not Started |       |
| `Bun.Database.deserialize`      | :x: Not Started |       |
| `Bun.Database.fileControl`      | :x: Not Started |       |

### Storage (0/9 - 0%)

| API                    | Status          | Notes |
| ---------------------- | --------------- | ----- |
| `Bun.S3Client`         | :x: Not Started |       |
| `Bun.S3Client.presign` | :x: Not Started |       |
| `Bun.S3Client.unlink`  | :x: Not Started |       |
| `Bun.S3Client.delete`  | :x: Not Started |       |
| `Bun.S3Client.size`    | :x: Not Started |       |
| `Bun.S3Client.exists`  | :x: Not Started |       |
| `Bun.S3Client.stat`    | :x: Not Started |       |
| `Bun.S3Client.list`    | :x: Not Started |       |
| `Bun.s3`               | :x: Not Started |       |

### Html (0/4 - 0%)

| API                       | Status          | Notes |
| ------------------------- | --------------- | ----- |
| `HTMLRewriter`            | :x: Not Started |       |
| `HTMLRewriter.on`         | :x: Not Started |       |
| `HTMLRewriter.onDocument` | :x: Not Started |       |
| `HTMLRewriter.transform`  | :x: Not Started |       |

### Ffi (0/11 - 0%)

| API                      | Status          | Notes |
| ------------------------ | --------------- | ----- |
| `Bun.dlopen`             | :x: Not Started |       |
| `Bun.cc`                 | :x: Not Started |       |
| `Bun.toBuffer`           | :x: Not Started |       |
| `Bun.toArrayBuffer`      | :x: Not Started |       |
| `Bun.read.ptr`           | :x: Not Started |       |
| `Bun.ptr`                | :x: Not Started |       |
| `Bun.CString`            | :x: Not Started |       |
| `Bun.CString.ptr`        | :x: Not Started |       |
| `Bun.CString.byteOffset` | :x: Not Started |       |
| `Bun.CString.byteLength` | :x: Not Started |       |
| `Bun.JSCallback.ptr`     | :x: Not Started |       |

## Progress by Module

| Module       | Total | Implemented | Partial | Progress |
| ------------ | ----- | ----------- | ------- | -------- |
| `bun`        | 240   | 11          | 27      | 10%      |
| `bun:sqlite` | 40    | 0           | 0       | 0%       |
| `bun:ffi`    | 31    | 0           | 0       | 0%       |
| `global`     | 141   | 0           | 0       | 0%       |

## Legend

- :white_check_mark: **Implemented**: Fully working polyfill
- :yellow_circle: **Partial**: Some features missing
- :construction: **Stub**: Exists but may throw or no-op
- :x: **Not Started**: No implementation yet
