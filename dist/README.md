# @captcha-la/angular

[English](./README.md) · [简体中文](./README.zh-CN.md)

Official Captchala CAPTCHA Angular component - Smart CAPTCHA protection for your Angular applications.

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- Standalone component, no NgModule needed
- `injectCaptchala()` for verifying on your own button (bind mode), with signals
- Works with Angular 16 and later, zone.js or zoneless, and server-side rendering
- Loads the CAPTCHA SDK from the CDN at runtime, so you always get the latest protection

## Installation

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## Quick Start

### Component Approach

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

With NgModules, add `CaptchalaComponent` to the module's `imports`.

### `injectCaptchala()` Approach

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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `appKey` | `string` | *required* | Your Captchala application key |
| `serverToken` | `string` | - | One-time, server-issued challenge token. Required when the app has `server_token_required=true`. See [Production: serverToken mode](#production-using-servertoken) below. |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | Display mode |
| `action` | `string` | `'default'` | Action identifier (e.g., 'login', 'register', 'checkout') |
| `lang` | `string` | browser language | Language code (`'zh-CN'`, `'en'`, `'ja'`, etc.); unset = the browser language. Changing it switches the language in place |
| `theme` | `string \| object` | - | Preset string or `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`. Omit to follow the system |
| `bindTo` | `string \| HTMLElement` | - | Element or selector to bind to (only for `product="bind"`) |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | Called when `serverToken` is rejected. Return a new token to retry once, or `null` to surface the error |

Changing `appKey`, `product`, `action`, `bindTo`, `serverToken` or `theme` rebuilds the widget.

## Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `success` | `CaptchalaResult` (`{ token, type, action }`) | Fired when verification succeeds |
| `error` | `error` | Fired when loading or verification fails |
| `close` | - | Fired when CAPTCHA is closed |
| `expired` | - | The pass token expired before it was used (fires once; with a listener, instead of `error`; the widget shows the expiry). See [Token expiry](#token-expiry) |
| `ready` | - | Fired when CAPTCHA is ready |

## Methods (via template reference or `viewChild`)

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

| Method | Description |
|--------|-------------|
| `verify()` | Trigger verification |
| `reset()` | Reset CAPTCHA state |
| `destroy()` | Destroy CAPTCHA instance |
| `bind(selector)` | Bind to element (for 'bind' mode). Named `bind` because `bindTo` is the input |
| `setLang(lang)` | Switch the language in place |
| `getInstance()` | The underlying SDK instance |

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

`injectCaptchala()` must run in an injection context (a constructor or field
initializer) and is destroyed with the component or service that created it.
Elsewhere, use `inject(CaptchalaService).create(options)` and call `destroy()`
yourself. `CaptchalaService.load()` preloads the SDK.

## Token expiry

The pass token from `success` is valid for a limited time. If the user waits too
long before submitting, the widget shows that the verification expired (the bar
or checkbox asks to verify again; in `bind` mode nothing is shown, since the
button is yours) and `expired` fires once, instead of `error`. You decide what
else happens, for example show your own message and call `reset()` then `verify()`
to start a new verification (the same pattern as an `expired-callback` +
`reset()` + `execute()` in other CAPTCHA widgets):

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

Without an `(expired)` listener, `error` fires once (class `expired`), as before.
`expired` never fires for offline or degraded tokens. `injectCaptchala({ onExpired })`
works the same way.

## Display Modes

### Popup Mode (Default)
Shows a button that triggers a popup CAPTCHA dialog.

```html
<captchala appKey="your-key" product="popup" />
```

### Float Mode
Displays an inline floating CAPTCHA widget.

```html
<captchala appKey="your-key" product="float" />
```

### Embed Mode
Embeds the CAPTCHA directly in the page.

```html
<captchala appKey="your-key" product="embed" />
```

### Bind Mode with `injectCaptchala()`
Best for form submissions - verifies when the user submits. See the
[`injectCaptchala()` approach](#injectcaptchala-approach) above.

## Server-side rendering

The component renders nothing on the server and loads the SDK only in the
browser, after the view is created. `injectCaptchala()` stays idle on the server
(`ready()` is `false`, `verify()` rejects). No extra configuration is needed for
Angular SSR or prerendering.

## Production: using `serverToken`

For production (login, registration, payment, etc.) we recommend the
**server-issued token flow**. Your backend holds the app secret, calls
`POST /v1/server/challenge/issue` with `X-App-Key` + `X-App-Secret` to mint a
one-time `server_token` (5-minute TTL), and hands that token to the browser.
The browser then renders the widget with `serverToken`:

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

The `@if` block syntax needs Angular 17; on Angular 16 use `*ngIf`.

Example backend endpoint (Express / Node.js):

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

Notes:
- Never embed `X-App-Secret` in browser code.
- Each `server_token` can be used exactly once. Regenerate before every widget mount.
- Legacy apps with `server_token_required=false` can still use the public `appKey`-only flow.

## Server-side Validation

After receiving the token from `success`, validate it on your server:

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

## TypeScript Support

Full TypeScript support is included:

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

## Example

A small Angular app with routing lives in [`example/`](./example). Build the
library first (`npm install && npm run build`), then run `npm install && npm start`
in `example/` and open `http://localhost:4200/?appKey=your-app-key`.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- [Website](https://captcha.la)
- [Documentation](https://docs.captcha.la/sdk/web)
- [Dashboard](https://dash.captcha.la)
