# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · [简体中文](https://github.com/Captcha-La/angular/blob/main/README.zh-CN.md) · [日本語](https://github.com/Captcha-La/angular/blob/main/README.ja.md) · [한국어](https://github.com/Captcha-La/angular/blob/main/README.ko.md) · **Español** · [Português (BR)](https://github.com/Captcha-La/angular/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/Captcha-La/angular/blob/main/README.de.md)

Componente oficial de CAPTCHA de Captchala para Angular: protección CAPTCHA inteligente para tus aplicaciones Angular.

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- Componente standalone, sin necesidad de NgModule
- `injectCaptchala()` para verificar desde tu propio botón (modo bind), con signals
- Compatible con Angular 16 y posteriores, con zone.js o zoneless, y con renderizado del lado del servidor
- Carga el SDK de CAPTCHA desde la CDN en tiempo de ejecución, así siempre tienes la protección más reciente

## Instalación

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## Inicio rápido

### Usando el componente

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

Con NgModules, añade `CaptchalaComponent` a los `imports` del módulo.

<a id="injectcaptchala-approach"></a>
### Usando `injectCaptchala()`

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

| Input | Tipo | Valor por defecto | Descripción |
|-------|------|---------|-------------|
| `appKey` | `string` | *obligatorio* | Tu clave de aplicación de Captchala |
| `serverToken` | `string` | - | Token de desafío de un solo uso emitido por el servidor. Obligatorio cuando la aplicación tiene `server_token_required=true`. Consulta [Producción: modo serverToken](#production-using-servertoken) más abajo. |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | Modo de visualización |
| `action` | `string` | `'default'` | Identificador de acción (p. ej., 'login', 'register', 'checkout') |
| `lang` | `string` | idioma del navegador | Código de idioma (`'zh-CN'`, `'en'`, `'ja'`, etc.); sin definir = el idioma del navegador. Al cambiarlo, el idioma se actualiza al momento |
| `theme` | `string \| object` | - | Cadena de preset o `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`. Omítelo para seguir la configuración del sistema |
| `bindTo` | `string \| HTMLElement` | - | Elemento o selector al que vincularse (solo para `product="bind"`) |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | Se llama cuando se rechaza `serverToken`. Devuelve un token nuevo para reintentar una vez, o `null` para propagar el error |

Cambiar `appKey`, `product`, `action`, `bindTo`, `serverToken` o `theme` reconstruye el widget.

## Outputs

| Output | Payload | Descripción |
|--------|---------|-------------|
| `success` | `CaptchalaResult` (`{ token, type, action }`) | Se emite cuando la verificación tiene éxito |
| `error` | `error` | Se emite cuando falla la carga o la verificación |
| `close` | - | Se emite cuando se cierra el CAPTCHA |
| `expired` | - | El pass token caducó antes de usarse (se emite una vez; con un listener, en lugar de `error`; el widget muestra la caducidad). Consulta [Caducidad del token](#token-expiry) |
| `ready` | - | Se emite cuando el CAPTCHA está listo |

## Métodos (mediante referencia de plantilla o `viewChild`)

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

| Método | Descripción |
|--------|-------------|
| `verify()` | Inicia la verificación |
| `reset()` | Restablece el estado del CAPTCHA |
| `destroy()` | Destruye la instancia del CAPTCHA |
| `bind(selector)` | Vincula a un elemento (para el modo 'bind'). Se llama `bind` porque `bindTo` es el input |
| `setLang(lang)` | Cambia el idioma al momento |
| `getInstance()` | La instancia subyacente del SDK |

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

`injectCaptchala()` debe ejecutarse en un contexto de inyección (un constructor o un inicializador
de campo) y se destruye junto con el componente o servicio que lo creó. En otros lugares, usa
`inject(CaptchalaService).create(options)` y llama a `destroy()` tú mismo.
`CaptchalaService.load()` precarga el SDK.

<a id="token-expiry"></a>
## Caducidad del token

El pass token de `success` es válido durante un tiempo limitado. Si el usuario espera demasiado
antes de enviar, el widget muestra que la verificación caducó (la barra o la casilla piden verificar
de nuevo; en el modo `bind` no se muestra nada, porque el botón es tuyo) y `expired` se emite una
vez, en lugar de `error`. Tú decides qué más ocurre; por ejemplo, mostrar tu propio mensaje y llamar
a `reset()` y luego a `verify()` para iniciar una nueva verificación (el mismo patrón que
`expired-callback` + `reset()` + `execute()` en otros widgets de CAPTCHA):

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

Sin un listener `(expired)`, `error` se emite una vez (clase `expired`), como antes.
`expired` nunca se emite para tokens offline o degradados. `injectCaptchala({ onExpired })`
funciona de la misma manera.

## Modos de visualización

### Modo Popup (por defecto)
Muestra un botón que abre un diálogo emergente con el CAPTCHA.

```html
<captchala appKey="your-key" product="popup" />
```

### Modo Float
Muestra un widget de CAPTCHA flotante en línea.

```html
<captchala appKey="your-key" product="float" />
```

### Modo Embed
Inserta el CAPTCHA directamente en la página.

```html
<captchala appKey="your-key" product="embed" />
```

### Modo Bind con `injectCaptchala()`
Ideal para el envío de formularios: verifica cuando el usuario envía. Consulta
[Usando `injectCaptchala()`](#injectcaptchala-approach) más arriba.

## Renderizado del lado del servidor

El componente no renderiza nada en el servidor y carga el SDK solo en el navegador, después de
crear la vista. `injectCaptchala()` permanece inactivo en el servidor (`ready()` es `false`,
`verify()` se rechaza). No se necesita configuración adicional para Angular SSR ni para el prerenderizado.

<a id="production-using-servertoken"></a>
## Producción: usando `serverToken`

Para producción (inicio de sesión, registro, pagos, etc.) recomendamos el **flujo de token emitido
por el servidor**. Tu backend guarda el secreto de la aplicación, llama a
`POST /v1/server/challenge/issue` con `X-App-Key` + `X-App-Secret` para generar un `server_token`
de un solo uso (TTL de 5 minutos) y entrega ese token al navegador.
Después, el navegador renderiza el widget con `serverToken`:

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

La sintaxis de bloque `@if` requiere Angular 17; en Angular 16 usa `*ngIf`.

Ejemplo de endpoint de backend (Express / Node.js):

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

Notas:
- Nunca incluyas `X-App-Secret` en el código del navegador.
- Cada `server_token` solo se puede usar una vez. Genera uno nuevo antes de cada montaje del widget.
- Las aplicaciones heredadas con `server_token_required=false` pueden seguir usando el flujo público solo con `appKey`.

## Validación del lado del servidor

Después de recibir el token de `success`, valídalo en tu servidor:

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

## Compatibilidad con TypeScript

Incluye compatibilidad completa con TypeScript:

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

## Ejemplo

En [`example/`](./example) hay una pequeña aplicación Angular con enrutamiento. Primero compila la
biblioteca (`npm install && npm run build`), luego ejecuta `npm install && npm start`
en `example/` y abre `http://localhost:4200/?appKey=your-app-key`.

## Licencia

Licencia MIT: consulta [LICENSE](./LICENSE) para más detalles.

## Enlaces

- [Sitio web](https://captcha.la)
- [Documentación](https://docs.captcha.la/sdk/web)
- [Panel de control](https://dash.captcha.la)
