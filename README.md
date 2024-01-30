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

> De ha Itt: 

```javascript
class Kreta {
    static base(ist) {
        return `https://${ist}.ekreta.hu`;
    }
    static IDP = "https://idp.e-kreta.hu";
    static ADMIN = "https://eugyintezes.e-kreta.hu";
    static FILES = "https://files.e-kreta.hu";
}
```

Modósítom ezt: `https://${ist}.ekreta.hu` ---> `https://${ist}.e-kreta.hu` erre. Akkor nem lesz csak ez a hiba: 

```bash

node:internal/process/promises:289
            triggerUncaughtException(err, true /* fromPromise */);
            ^
AxiosError: Hostname/IP does not match certificate's altnames: Host: bgeszc-eotvos.ekreta.hu. is not in the cert's altnames: DNS:*.e-kreta.hu, DNS:e-kreta.hu
    at AxiosError.from (C:\Users\Beni\Pictures\kreta geci\node_modules\axios\dist\node\axios.cjs:837:14)
    at RedirectableRequest.handleRequestError (C:\Users\Beni\Pictures\kreta geci\node_modules\axios\dist\node\axios.cjs:3087:25)
    at RedirectableRequest.emit (node:events:514:28)
    at eventHandlers.<computed> (C:\Users\Beni\Pictures\kreta geci\node_modules\follow-redirects\index.js:38:24)
    at ClientRequest.emit (node:events:514:28)
    at TLSSocket.socketErrorListener (node:_http_client:495:9)
    at TLSSocket.emit (node:events:514:28)
    at emitErrorNT (node:internal/streams/destroy:151:8)
    at emitErrorCloseNT (node:internal/streams/destroy:116:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)
    at Axios.request (C:\Users\Beni\Pictures\kreta geci\node_modules\axios\dist\node\axios.cjs:3877:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async User.getInfo (C:\Users\Beni\Pictures\kreta geci\index.js:215:26)
    at async C:\Users\Beni\Pictures\kreta geci\index.js:225:17 {
```

Szóval!
