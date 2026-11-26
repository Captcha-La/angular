# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · [简体中文](https://github.com/Captcha-La/angular/blob/main/README.zh-CN.md) · [日本語](https://github.com/Captcha-La/angular/blob/main/README.ja.md) · [한국어](https://github.com/Captcha-La/angular/blob/main/README.ko.md) · [Español](https://github.com/Captcha-La/angular/blob/main/README.es.md) · [Português (BR)](https://github.com/Captcha-La/angular/blob/main/README.pt-BR.md) · **Deutsch**

Offizielle Captchala-CAPTCHA-Komponente für Angular – intelligenter CAPTCHA-Schutz für Ihre Angular-Anwendungen.

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- Standalone-Komponente, kein NgModule erforderlich
- `injectCaptchala()` zur Verifizierung über Ihren eigenen Button (bind-Modus), mit Signals
- Funktioniert mit Angular 16 und neuer, mit zone.js oder zoneless sowie mit Server-Side Rendering
- Lädt das CAPTCHA-SDK zur Laufzeit vom CDN, sodass Sie immer den aktuellsten Schutz erhalten

## Installation

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## Schnellstart

### Mit der Komponente

```ts
import { Component } from '@angular/core'
import { CaptchalaComponent, type CaptchalaResult } from '@captcha-la/angular'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CaptchalaComponent],
  template: `
    <captchala
      appKey="your-app-key"
      product="popup"
      (success)="onSuccess($event)"
      (error)="onError($event)"
    />
  `
})
export class LoginComponent {
  onSuccess(result: CaptchalaResult) {
    console.log('Verification successful!')
    console.log('Token:', result.token)
    // Send token to your server for validation
  }

  onError(err: unknown) {
    console.error(err)
  }
}
```

Mit NgModules fügen Sie `CaptchalaComponent` zu den `imports` des Moduls hinzu.

<a id="injectcaptchala-approach"></a>
### Mit `injectCaptchala()`

```ts
import { Component } from '@angular/core'
import { injectCaptchala } from '@captcha-la/angular'

@Component({
  selector: 'app-login-form',
  standalone: true,
  template: `
    <form (submit)="onSubmit($event)">
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit" [disabled]="!captcha.ready()">Login</button>
    </form>
  `
})
export class LoginFormComponent {
  // Destroyed automatically together with the component
  readonly captcha = injectCaptchala({
    appKey: 'your-app-key',
    product: 'bind',
    action: 'login'
  })

  async onSubmit(e: Event) {
    e.preventDefault()
    try {
      const result = await this.captcha.verify()
      console.log('Token:', result.token)
      // Continue with form submission
    } catch (err) {
      console.error('Verification failed:', err)
    }
  }
}
```

## Inputs

| Input | Typ | Standard | Beschreibung |
|-------|------|---------|-------------|
| `appKey` | `string` | *erforderlich* | Ihr Captchala-Anwendungsschlüssel |
| `serverToken` | `string` | - | Einmaliges, vom Server ausgestelltes Challenge-Token. Erforderlich, wenn für die App `server_token_required=true` gesetzt ist. Siehe [Produktion: serverToken-Modus](#production-using-servertoken) weiter unten. |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | Anzeigemodus |
| `action` | `string` | `'default'` | Aktionskennung (z. B. 'login', 'register', 'checkout') |
| `lang` | `string` | Browsersprache | Sprachcode (`'zh-CN'`, `'en'`, `'ja'` usw.); nicht gesetzt = Browsersprache. Eine Änderung wechselt die Sprache direkt |
| `theme` | `string \| object` | - | Preset-String oder `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`. Weglassen, um dem System zu folgen |
| `bindTo` | `string \| HTMLElement` | - | Element oder Selektor, an das gebunden wird (nur für `product="bind"`) |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | Wird aufgerufen, wenn `serverToken` abgelehnt wird. Geben Sie ein neues Token zurück, um es einmal erneut zu versuchen, oder `null`, um den Fehler weiterzugeben |

Eine Änderung von `appKey`, `product`, `action`, `bindTo`, `serverToken` oder `theme` baut das Widget neu auf.

## Outputs

| Output | Payload | Beschreibung |
|--------|---------|-------------|
| `success` | `CaptchalaResult` (`{ token, type, action }`) | Wird ausgelöst, wenn die Verifizierung erfolgreich ist |
| `error` | `error` | Wird ausgelöst, wenn das Laden oder die Verifizierung fehlschlägt |
| `close` | - | Wird ausgelöst, wenn das CAPTCHA geschlossen wird |
| `expired` | - | Das pass token ist abgelaufen, bevor es verwendet wurde (wird einmal ausgelöst; mit Listener anstelle von `error`; das Widget zeigt den Ablauf an). Siehe [Token-Ablauf](#token-expiry) |
| `ready` | - | Wird ausgelöst, wenn das CAPTCHA bereit ist |

## Methoden (über Template-Referenz oder `viewChild`)

```ts
@Component({
  standalone: true,
  imports: [CaptchalaComponent],
  template: `
    <captchala #captcha appKey="your-app-key" />
    <button (click)="captcha.verify()">Verify</button>
  `
})
export class AppComponent {}
```

| Methode | Beschreibung |
|--------|-------------|
| `verify()` | Verifizierung starten |
| `reset()` | CAPTCHA-Status zurücksetzen |
| `destroy()` | CAPTCHA-Instanz zerstören |
| `bind(selector)` | An ein Element binden (für den 'bind'-Modus). Heißt `bind`, weil `bindTo` der Input ist |
| `setLang(lang)` | Sprache direkt wechseln |
| `getInstance()` | Die zugrunde liegende SDK-Instanz |

## `injectCaptchala()` / `CaptchalaService`

```ts
const {
  ready,      // Signal<boolean> - SDK is loaded and ready
  loading,    // Signal<boolean> - SDK is loading
  error,      // Signal<Error | null> - Loading or configuration error
  verify,     // () => Promise<CaptchalaResult> - Trigger verification
  reset,      // () => void - Reset state
  bindTo,     // (selector) => void - Bind to element
  appendTo,   // (selector) => void - Append to element
  setLang,    // (lang) => void - Switch language
  destroy     // () => void - Destroy (done for you by injectCaptchala)
} = injectCaptchala(options)
```

`injectCaptchala()` muss in einem Injection Context laufen (einem Konstruktor oder Feld-Initialisierer)
und wird zusammen mit der Komponente oder dem Service zerstört, die bzw. der es erstellt hat.
An anderen Stellen verwenden Sie `inject(CaptchalaService).create(options)` und rufen `destroy()`
selbst auf. `CaptchalaService.load()` lädt das SDK vorab.

<a id="token-expiry"></a>
## Token-Ablauf

Das pass token aus `success` ist nur begrenzte Zeit gültig. Wartet der Nutzer zu lange mit dem Absenden,
zeigt das Widget an, dass die Verifizierung abgelaufen ist (die Leiste oder Checkbox fordert zur erneuten
Verifizierung auf; im `bind`-Modus wird nichts angezeigt, da der Button Ihnen gehört), und `expired` wird
einmal ausgelöst, anstelle von `error`. Was sonst passiert, entscheiden Sie – zum Beispiel eine eigene
Meldung anzeigen und `reset()` und danach `verify()` aufrufen, um eine neue Verifizierung zu starten
(dasselbe Muster wie `expired-callback` + `reset()` + `execute()` bei anderen CAPTCHA-Widgets):

```ts
@Component({
  standalone: true,
  imports: [CaptchalaComponent],
  template: `
    <captchala
      #captcha
      appKey="your-app-key"
      (success)="token.set($event.token); expired.set(false)"
      (expired)="token.set(''); expired.set(true)"
    />
    @if (expired()) {
      <p>Token expired. <button (click)="expired.set(false); captcha.reset(); captcha.verify()">Verify again</button></p>
    }
  `
})
export class FormComponent {
  token = signal('')
  expired = signal(false)
}
```

Ohne `(expired)`-Listener wird wie bisher einmal `error` ausgelöst (Klasse `expired`).
Für Offline- oder Degraded-Tokens wird `expired` nie ausgelöst. `injectCaptchala({ onExpired })`
funktioniert genauso.

## Anzeigemodi

### Popup-Modus (Standard)
Zeigt einen Button, der einen CAPTCHA-Popup-Dialog öffnet.

```html
<captchala appKey="your-key" product="popup" />
```

### Float-Modus
Zeigt ein schwebendes Inline-CAPTCHA-Widget an.

```html
<captchala appKey="your-key" product="float" />
```

### Embed-Modus
Bettet das CAPTCHA direkt in die Seite ein.

```html
<captchala appKey="your-key" product="embed" />
```

### Bind-Modus mit `injectCaptchala()`
Ideal für Formulare – verifiziert, wenn der Nutzer absendet. Siehe
[Mit `injectCaptchala()`](#injectcaptchala-approach) weiter oben.

## Server-Side Rendering

Die Komponente rendert auf dem Server nichts und lädt das SDK erst im Browser, nachdem die View
erstellt wurde. `injectCaptchala()` bleibt auf dem Server inaktiv (`ready()` ist `false`,
`verify()` wird abgelehnt). Für Angular SSR oder Prerendering ist keine zusätzliche Konfiguration nötig.

<a id="production-using-servertoken"></a>
## Produktion: `serverToken` verwenden

Für die Produktion (Login, Registrierung, Zahlung usw.) empfehlen wir den **Ablauf mit
serverseitig ausgestelltem Token**. Ihr Backend verwahrt das App-Secret, ruft
`POST /v1/server/challenge/issue` mit `X-App-Key` + `X-App-Secret` auf, um ein einmaliges
`server_token` (TTL 5 Minuten) zu erzeugen, und übergibt dieses Token an den Browser.
Der Browser rendert das Widget dann mit `serverToken`:

```ts
import { Component, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CaptchalaComponent } from '@captcha-la/angular'

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CaptchalaComponent],
  template: `
    @if (serverToken()) {
      <captchala
        appKey="pk_your_public_app_key"
        action="login"
        [serverToken]="serverToken()"
        (success)="onSuccess($event.token)"
      />
    } @else {
      <div>Loading...</div>
    }
  `
})
export class LoginPageComponent {
  serverToken = signal<string | undefined>(undefined)

  constructor() {
    // Your own backend endpoint that proxies /v1/server/challenge/issue
    inject(HttpClient)
      .get<{ server_token: string }>('/api/captcha-token')
      .subscribe((d) => this.serverToken.set(d.server_token))
  }

  onSuccess(passToken: string) {
    console.log('pass_token:', passToken)
  }
}
```

Die `@if`-Blocksyntax erfordert Angular 17; unter Angular 16 verwenden Sie `*ngIf`.

Beispiel-Endpunkt im Backend (Express / Node.js):

```js
// server.js — call this from your own /api/captcha-token handler
app.get('/api/captcha-token', async (req, res) => {
  const r = await fetch('https://verify.captcha.la/v1/server/challenge/issue', {
    method: 'POST',
    headers: {
      'X-App-Key': process.env.CAPTCHALA_APP_KEY,
      'X-App-Secret': process.env.CAPTCHALA_APP_SECRET,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'action=login&ttl=300'
  })
  const { data } = await r.json()
  res.json({ server_token: data.server_token })
})
```

Hinweise:
- Betten Sie `X-App-Secret` niemals in Browser-Code ein.
- Jedes `server_token` kann genau einmal verwendet werden. Erzeugen Sie vor jedem Mounten des Widgets ein neues.
- Ältere Apps mit `server_token_required=false` können weiterhin den öffentlichen Ablauf nur mit `appKey` nutzen.

## Serverseitige Validierung

Nachdem Sie das Token aus `success` erhalten haben, validieren Sie es auf Ihrem Server:

```js
// Your backend
const response = await fetch('https://verify.captcha.la/v1/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Key': process.env.CAPTCHALA_APP_KEY,
    'X-App-Secret': process.env.CAPTCHALA_APP_SECRET
  },
  // pass_token = result.token from (success); client_ip is optional but recommended
  body: JSON.stringify({ pass_token: token, client_ip: req.ip })
})

const result = await response.json()
if (result.code === 0 && result.data.valid === true) {
  // Token is valid, proceed with the request
}
```

## TypeScript-Unterstützung

Vollständige TypeScript-Unterstützung ist enthalten:

```ts
import {
  CaptchalaComponent,
  CaptchalaService,
  injectCaptchala,
  type CaptchalaResult,
  type CaptchalaHandle,
  type CaptchalaHandleOptions
} from '@captcha-la/angular'
```

## Beispiel

Eine kleine Angular-App mit Routing liegt in [`example/`](./example). Bauen Sie zuerst die
Bibliothek (`npm install && npm run build`), führen Sie dann `npm install && npm start`
in `example/` aus und öffnen Sie `http://localhost:4200/?appKey=your-app-key`.

## Lizenz

MIT-Lizenz – Details siehe [LICENSE](./LICENSE).

## Links

- [Website](https://captcha.la)
- [Dokumentation](https://docs.captcha.la/sdk/web)
- [Dashboard](https://dash.captcha.la)
