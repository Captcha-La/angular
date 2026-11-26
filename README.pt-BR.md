# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · [简体中文](https://github.com/Captcha-La/angular/blob/main/README.zh-CN.md) · [日本語](https://github.com/Captcha-La/angular/blob/main/README.ja.md) · [한국어](https://github.com/Captcha-La/angular/blob/main/README.ko.md) · [Español](https://github.com/Captcha-La/angular/blob/main/README.es.md) · **Português (BR)** · [Deutsch](https://github.com/Captcha-La/angular/blob/main/README.de.md)

Componente oficial de CAPTCHA da Captchala para Angular: proteção CAPTCHA inteligente para suas aplicações Angular.

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- Componente standalone, sem necessidade de NgModule
- `injectCaptchala()` para verificar a partir do seu próprio botão (modo bind), com signals
- Funciona com Angular 16 ou superior, com zone.js ou zoneless, e com renderização no servidor
- Carrega o SDK de CAPTCHA a partir da CDN em tempo de execução, então você sempre tem a proteção mais recente

## Instalação

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## Início rápido

### Usando o componente

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

Com NgModules, adicione `CaptchalaComponent` aos `imports` do módulo.

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

| Input | Tipo | Padrão | Descrição |
|-------|------|---------|-------------|
| `appKey` | `string` | *obrigatório* | Sua chave de aplicação da Captchala |
| `serverToken` | `string` | - | Token de desafio de uso único emitido pelo servidor. Obrigatório quando a aplicação tem `server_token_required=true`. Veja [Produção: modo serverToken](#production-using-servertoken) abaixo. |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | Modo de exibição |
| `action` | `string` | `'default'` | Identificador da ação (ex.: 'login', 'register', 'checkout') |
| `lang` | `string` | idioma do navegador | Código de idioma (`'zh-CN'`, `'en'`, `'ja'` etc.); sem valor = idioma do navegador. Alterá-lo troca o idioma na hora |
| `theme` | `string \| object` | - | String de preset ou `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`. Omita para seguir o sistema |
| `bindTo` | `string \| HTMLElement` | - | Elemento ou seletor ao qual vincular (somente para `product="bind"`) |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | Chamado quando o `serverToken` é rejeitado. Retorne um novo token para tentar mais uma vez, ou `null` para repassar o erro |

Alterar `appKey`, `product`, `action`, `bindTo`, `serverToken` ou `theme` recria o widget.

## Outputs

| Output | Payload | Descrição |
|--------|---------|-------------|
| `success` | `CaptchalaResult` (`{ token, type, action }`) | Emitido quando a verificação é concluída com sucesso |
| `error` | `error` | Emitido quando o carregamento ou a verificação falha |
| `close` | - | Emitido quando o CAPTCHA é fechado |
| `expired` | - | O pass token expirou antes de ser usado (emitido uma vez; com um listener, no lugar de `error`; o widget mostra a expiração). Veja [Expiração do token](#token-expiry) |
| `ready` | - | Emitido quando o CAPTCHA está pronto |

## Métodos (via referência de template ou `viewChild`)

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

| Método | Descrição |
|--------|-------------|
| `verify()` | Inicia a verificação |
| `reset()` | Redefine o estado do CAPTCHA |
| `destroy()` | Destrói a instância do CAPTCHA |
| `bind(selector)` | Vincula a um elemento (para o modo 'bind'). Chama-se `bind` porque `bindTo` é o input |
| `setLang(lang)` | Troca o idioma na hora |
| `getInstance()` | A instância do SDK subjacente |

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

`injectCaptchala()` precisa ser executado em um contexto de injeção (um construtor ou um
inicializador de campo) e é destruído junto com o componente ou serviço que o criou.
Em outros lugares, use `inject(CaptchalaService).create(options)` e chame `destroy()`
você mesmo. `CaptchalaService.load()` pré-carrega o SDK.

<a id="token-expiry"></a>
## Expiração do token

O pass token de `success` é válido por tempo limitado. Se o usuário demorar demais para enviar,
o widget mostra que a verificação expirou (a barra ou a caixa de seleção pede uma nova verificação;
no modo `bind` nada é exibido, já que o botão é seu) e `expired` é emitido uma vez, no lugar de
`error`. Você decide o que mais acontece; por exemplo, mostrar sua própria mensagem e chamar
`reset()` e depois `verify()` para iniciar uma nova verificação (o mesmo padrão de
`expired-callback` + `reset()` + `execute()` em outros widgets de CAPTCHA):

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

Sem um listener `(expired)`, `error` é emitido uma vez (classe `expired`), como antes.
`expired` nunca é emitido para tokens offline ou degradados. `injectCaptchala({ onExpired })`
funciona da mesma forma.

## Modos de exibição

### Modo Popup (padrão)
Mostra um botão que abre uma janela pop-up com o CAPTCHA.

```html
<captchala appKey="your-key" product="popup" />
```

### Modo Float
Exibe um widget de CAPTCHA flutuante embutido na página.

```html
<captchala appKey="your-key" product="float" />
```

### Modo Embed
Incorpora o CAPTCHA diretamente na página.

```html
<captchala appKey="your-key" product="embed" />
```

### Modo Bind com `injectCaptchala()`
Ideal para envio de formulários: verifica quando o usuário envia. Veja
[Usando `injectCaptchala()`](#injectcaptchala-approach) acima.

## Renderização no servidor

O componente não renderiza nada no servidor e carrega o SDK apenas no navegador, depois que a
view é criada. `injectCaptchala()` fica inativo no servidor (`ready()` é `false`, `verify()`
é rejeitado). Nenhuma configuração extra é necessária para Angular SSR ou pré-renderização.

<a id="production-using-servertoken"></a>
## Produção: usando `serverToken`

Em produção (login, cadastro, pagamento etc.) recomendamos o **fluxo de token emitido pelo
servidor**. Seu backend guarda o secret da aplicação, chama
`POST /v1/server/challenge/issue` com `X-App-Key` + `X-App-Secret` para gerar um `server_token`
de uso único (TTL de 5 minutos) e entrega esse token ao navegador.
Em seguida, o navegador renderiza o widget com `serverToken`:

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

A sintaxe de bloco `@if` exige Angular 17; no Angular 16 use `*ngIf`.

Exemplo de endpoint de backend (Express / Node.js):

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

Observações:
- Nunca inclua `X-App-Secret` no código do navegador.
- Cada `server_token` pode ser usado exatamente uma vez. Gere um novo antes de cada montagem do widget.
- Aplicações legadas com `server_token_required=false` ainda podem usar o fluxo público apenas com `appKey`.

## Validação no servidor

Depois de receber o token em `success`, valide-o no seu servidor:

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

## Suporte a TypeScript

Suporte completo a TypeScript incluído:

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

## Exemplo

Um pequeno app Angular com roteamento está em [`example/`](./example). Primeiro faça o build da
biblioteca (`npm install && npm run build`), depois execute `npm install && npm start`
em `example/` e abra `http://localhost:4200/?appKey=your-app-key`.

## Licença

Licença MIT: veja [LICENSE](./LICENSE) para mais detalhes.

## Links

- [Site](https://captcha.la)
- [Documentação](https://docs.captcha.la/sdk/web)
- [Painel](https://dash.captcha.la)
