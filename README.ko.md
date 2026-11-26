# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · [简体中文](https://github.com/Captcha-La/angular/blob/main/README.zh-CN.md) · [日本語](https://github.com/Captcha-La/angular/blob/main/README.ja.md) · **한국어** · [Español](https://github.com/Captcha-La/angular/blob/main/README.es.md) · [Português (BR)](https://github.com/Captcha-La/angular/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/Captcha-La/angular/blob/main/README.de.md)

Captchala 공식 CAPTCHA Angular 컴포넌트 - Angular 애플리케이션을 위한 스마트 CAPTCHA 보호.

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- 스탠드얼론 컴포넌트로 NgModule이 필요 없습니다
- `injectCaptchala()`로 직접 만든 버튼에서 검증 실행(bind 모드), signals 지원
- Angular 16 이상, zone.js 또는 zoneless, 서버 사이드 렌더링 지원
- CAPTCHA SDK를 런타임에 CDN에서 불러오므로 항상 최신 보호 기능을 사용합니다

## 설치

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## 빠른 시작

### 컴포넌트 방식

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

NgModule을 사용한다면 모듈의 `imports`에 `CaptchalaComponent`를 추가하세요.

<a id="injectcaptchala-approach"></a>
### `injectCaptchala()` 방식

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

| Input | 타입 | 기본값 | 설명 |
|-------|------|---------|-------------|
| `appKey` | `string` | *필수* | Captchala 애플리케이션 키 |
| `serverToken` | `string` | - | 서버에서 발급한 일회용 챌린지 토큰. 앱에 `server_token_required=true`가 설정된 경우 필수입니다. 아래 [프로덕션: serverToken 모드](#production-using-servertoken)를 참고하세요. |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | 표시 모드 |
| `action` | `string` | `'default'` | 액션 식별자 (예: 'login', 'register', 'checkout') |
| `lang` | `string` | 브라우저 언어 | 언어 코드 (`'zh-CN'`, `'en'`, `'ja'` 등). 지정하지 않으면 브라우저 언어를 사용합니다. 값을 바꾸면 그 자리에서 언어가 전환됩니다 |
| `theme` | `string \| object` | - | 프리셋 문자열 또는 `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`. 생략하면 시스템 설정을 따릅니다 |
| `bindTo` | `string \| HTMLElement` | - | 바인딩할 요소 또는 셀렉터 (`product="bind"`에서만 사용) |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | `serverToken`이 거부되면 호출됩니다. 새 토큰을 반환하면 한 번 재시도하고, `null`을 반환하면 오류를 전달합니다 |

`appKey`, `product`, `action`, `bindTo`, `serverToken`, `theme`을 변경하면 위젯이 다시 생성됩니다.

## Outputs

| Output | 페이로드 | 설명 |
|--------|---------|-------------|
| `success` | `CaptchalaResult` (`{ token, type, action }`) | 검증에 성공하면 발생 |
| `error` | `error` | 로딩 또는 검증에 실패하면 발생 |
| `close` | - | CAPTCHA가 닫히면 발생 |
| `expired` | - | pass token이 사용되기 전에 만료됨 (한 번만 발생. 리스너가 있으면 `error` 대신 발생하며, 위젯에 만료가 표시됩니다). [토큰 만료](#token-expiry) 참고 |
| `ready` | - | CAPTCHA가 준비되면 발생 |

## 메서드 (템플릿 참조 또는 `viewChild` 사용)

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

| 메서드 | 설명 |
|--------|-------------|
| `verify()` | 검증 시작 |
| `reset()` | CAPTCHA 상태 초기화 |
| `destroy()` | CAPTCHA 인스턴스 제거 |
| `bind(selector)` | 요소에 바인딩 ('bind' 모드용). `bindTo`가 Input 이름이므로 메서드 이름은 `bind`입니다 |
| `setLang(lang)` | 그 자리에서 언어 전환 |
| `getInstance()` | 내부 SDK 인스턴스 |

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

`injectCaptchala()`는 인젝션 컨텍스트(생성자 또는 필드 이니셜라이저)에서 실행해야 하며,
이를 생성한 컴포넌트나 서비스와 함께 제거됩니다. 그 밖의 위치에서는
`inject(CaptchalaService).create(options)`를 사용하고 `destroy()`를 직접 호출하세요.
`CaptchalaService.load()`는 SDK를 미리 불러옵니다.

<a id="token-expiry"></a>
## 토큰 만료

`success`에서 받은 pass token은 유효 시간이 제한되어 있습니다. 사용자가 제출하기까지 너무 오래
기다리면 위젯에 검증이 만료되었다고 표시되고(바 또는 체크박스가 다시 검증하도록 안내합니다.
`bind` 모드에서는 버튼을 직접 만들었으므로 아무것도 표시되지 않습니다) `error` 대신 `expired`가
한 번 발생합니다. 이후 동작은 직접 정할 수 있습니다. 예를 들어 자체 메시지를 보여 주고 `reset()`에
이어 `verify()`를 호출해 새 검증을 시작할 수 있습니다(다른 CAPTCHA 위젯의 `expired-callback` +
`reset()` + `execute()`와 같은 패턴입니다):

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

`(expired)` 리스너가 없으면 기존과 같이 `error`가 한 번 발생합니다(클래스 `expired`).
오프라인 또는 성능 저하(degraded) 토큰에서는 `expired`가 발생하지 않습니다. `injectCaptchala({ onExpired })`도
같은 방식으로 동작합니다.

## 표시 모드

### Popup 모드 (기본값)
버튼을 표시하고, 클릭하면 CAPTCHA 팝업 대화상자가 열립니다.

```html
<captchala appKey="your-key" product="popup" />
```

### Float 모드
인라인 플로팅 CAPTCHA 위젯을 표시합니다.

```html
<captchala appKey="your-key" product="float" />
```

### Embed 모드
CAPTCHA를 페이지에 직접 삽입합니다.

```html
<captchala appKey="your-key" product="embed" />
```

### `injectCaptchala()`를 사용한 Bind 모드
폼 제출에 가장 적합하며, 사용자가 제출할 때 검증합니다. 위의
[`injectCaptchala()` 방식](#injectcaptchala-approach)을 참고하세요.

## 서버 사이드 렌더링

컴포넌트는 서버에서는 아무것도 렌더링하지 않으며, 뷰가 생성된 후 브라우저에서만 SDK를 불러옵니다.
`injectCaptchala()`는 서버에서 대기 상태로 유지됩니다(`ready()`는 `false`, `verify()`는 reject).
Angular SSR이나 프리렌더링을 위한 추가 설정은 필요 없습니다.

<a id="production-using-servertoken"></a>
## 프로덕션: `serverToken` 사용

프로덕션 환경(로그인, 회원가입, 결제 등)에서는 **서버 발급 토큰 흐름**을 권장합니다.
백엔드가 앱 시크릿을 보관하고, `X-App-Key` + `X-App-Secret`으로
`POST /v1/server/challenge/issue`를 호출해 일회용 `server_token`(TTL 5분)을 발급한 뒤
그 토큰을 브라우저에 전달합니다. 브라우저는 `serverToken`으로 위젯을 렌더링합니다:

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

`@if` 블록 문법은 Angular 17이 필요합니다. Angular 16에서는 `*ngIf`를 사용하세요.

백엔드 엔드포인트 예시 (Express / Node.js):

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

참고:
- `X-App-Secret`을 브라우저 코드에 절대 넣지 마세요.
- 각 `server_token`은 정확히 한 번만 사용할 수 있습니다. 위젯을 마운트할 때마다 새로 발급하세요.
- `server_token_required=false`인 레거시 앱은 기존처럼 공개 `appKey`만 사용하는 흐름을 쓸 수 있습니다.

## 서버 측 검증

`success`에서 토큰을 받은 후 서버에서 검증하세요:

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

## TypeScript 지원

TypeScript를 완벽하게 지원합니다:

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

## 예제

라우팅이 포함된 작은 Angular 앱이 [`example/`](./example)에 있습니다. 먼저 라이브러리를
빌드하고(`npm install && npm run build`), `example/`에서 `npm install && npm start`를 실행한 뒤
`http://localhost:4200/?appKey=your-app-key`를 여세요.

## 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.

## 링크

- [웹사이트](https://captcha.la)
- [문서](https://docs.captcha.la/sdk/web)
- [대시보드](https://dash.captcha.la)
