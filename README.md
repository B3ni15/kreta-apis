# Kréta API Node.js

Folyamatos Hibát lehet kapni: 

```bash
node:internal/process/promises:289
            triggerUncaughtException(err, true /* fromPromise */);
            ^

Error: read ECONNRESET
    at TLSWrap.onStreamRead (node:internal/stream_base_commons:217:20) {
  errno: -4077,
  code: 'ECONNRESET',
  syscall: 'read'
}

Node.js v20.10.0
```
