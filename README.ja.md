# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · [简体中文](https://github.com/Captcha-La/angular/blob/main/README.zh-CN.md) · **日本語** · [한국어](https://github.com/Captcha-La/angular/blob/main/README.ko.md) · [Español](https://github.com/Captcha-La/angular/blob/main/README.es.md) · [Português (BR)](https://github.com/Captcha-La/angular/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/Captcha-La/angular/blob/main/README.de.md)

Captchala 公式の CAPTCHA Angular コンポーネント。Angular アプリケーションをスマートな CAPTCHA で保護します。

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- スタンドアロンコンポーネントなので NgModule は不要
- `injectCaptchala()` で独自のボタンから検証を実行可能（bind モード）、signals 対応
- Angular 16 以降、zone.js / zoneless、サーバーサイドレンダリングに対応
- CAPTCHA SDK は実行時に CDN から読み込まれるため、常に最新の保護が適用されます

## インストール

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## クイックスタート

### コンポーネントを使う方法

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

NgModule を使う場合は、モジュールの `imports` に `CaptchalaComponent` を追加してください。

<a id="injectcaptchala-approach"></a>
### `injectCaptchala()` を使う方法

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

| Input | 型 | デフォルト | 説明 |
|-------|------|---------|-------------|
| `appKey` | `string` | *必須* | Captchala のアプリケーションキー |
| `serverToken` | `string` | - | サーバーが発行するワンタイムのチャレンジトークン。アプリで `server_token_required=true` が設定されている場合は必須です。下記の [本番環境: serverToken モード](#production-using-servertoken) を参照してください。 |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | 表示モード |
| `action` | `string` | `'default'` | アクション識別子（例: 'login'、'register'、'checkout'） |
| `lang` | `string` | ブラウザの言語 | 言語コード（`'zh-CN'`、`'en'`、`'ja'` など）。未指定の場合はブラウザの言語。変更するとその場で言語が切り替わります |
| `theme` | `string \| object` | - | プリセット文字列、または `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`。省略するとシステム設定に従います |
| `bindTo` | `string \| HTMLElement` | - | バインド先の要素またはセレクター（`product="bind"` のときのみ） |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | `serverToken` が拒否されたときに呼ばれます。新しいトークンを返すと 1 回だけ再試行し、`null` を返すとエラーを通知します |

`appKey`、`product`、`action`、`bindTo`、`serverToken`、`theme` を変更するとウィジェットが再構築されます。

## Outputs

| Output | ペイロード | 説明 |
|--------|---------|-------------|
| `success` | `CaptchalaResult`（`{ token, type, action }`） | 検証に成功したときに発火 |
| `error` | `error` | 読み込みまたは検証に失敗したときに発火 |
| `close` | - | CAPTCHA が閉じられたときに発火 |
| `expired` | - | pass token が使用前に期限切れになった（1 回だけ発火。リスナーがある場合は `error` の代わりに発火し、ウィジェットに期限切れが表示されます）。[トークンの有効期限](#token-expiry) を参照 |
| `ready` | - | CAPTCHA の準備が完了したときに発火 |

## メソッド（テンプレート参照または `viewChild` 経由）

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

| メソッド | 説明 |
|--------|-------------|
| `verify()` | 検証を開始 |
| `reset()` | CAPTCHA の状態をリセット |
| `destroy()` | CAPTCHA インスタンスを破棄 |
| `bind(selector)` | 要素にバインド（'bind' モード用）。`bindTo` は Input 名のため、メソッド名は `bind` です |
| `setLang(lang)` | その場で言語を切り替え |
| `getInstance()` | 内部の SDK インスタンス |

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

`injectCaptchala()` はインジェクションコンテキスト（コンストラクターまたはフィールド初期化子）で
呼び出す必要があり、それを作成したコンポーネントまたはサービスと一緒に破棄されます。
それ以外の場所では `inject(CaptchalaService).create(options)` を使い、`destroy()` を
自分で呼び出してください。`CaptchalaService.load()` は SDK を事前に読み込みます。

<a id="token-expiry"></a>
## トークンの有効期限

`success` で受け取る pass token の有効期間には制限があります。ユーザーが送信までに長く待ちすぎると、
ウィジェットに検証の期限切れが表示され（バーやチェックボックスが再検証を求めます。`bind` モードでは
ボタンがあなたのものなので何も表示されません）、`error` の代わりに `expired` が 1 回だけ発火します。
その後の処理はあなたが決めます。たとえば独自のメッセージを表示し、`reset()` に続けて `verify()` を
呼び出して新しい検証を開始できます（他の CAPTCHA ウィジェットにおける `expired-callback` +
`reset()` + `execute()` と同じパターンです）:

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

`(expired)` リスナーがない場合は、従来どおり `error` が 1 回発火します（クラス `expired`）。
オフラインまたは縮退モードのトークンでは `expired` は発火しません。`injectCaptchala({ onExpired })`
も同じように動作します。

## 表示モード

### Popup モード（デフォルト）
ボタンを表示し、クリックで CAPTCHA のポップアップダイアログを開きます。

```html
<captchala appKey="your-key" product="popup" />
```

### Float モード
インラインのフローティング CAPTCHA ウィジェットを表示します。

```html
<captchala appKey="your-key" product="float" />
```

### Embed モード
CAPTCHA をページ内に直接埋め込みます。

```html
<captchala appKey="your-key" product="embed" />
```

### `injectCaptchala()` を使った Bind モード
フォーム送信に最適で、ユーザーが送信したときに検証します。上記の
[`injectCaptchala()` を使う方法](#injectcaptchala-approach) を参照してください。

## サーバーサイドレンダリング

コンポーネントはサーバー上では何もレンダリングせず、ビューの作成後にブラウザでのみ SDK を
読み込みます。`injectCaptchala()` はサーバー上では待機状態のままです（`ready()` は `false`、
`verify()` は reject されます）。Angular SSR やプリレンダリングに追加の設定は不要です。

<a id="production-using-servertoken"></a>
## 本番環境: `serverToken` を使う

本番環境（ログイン、会員登録、決済など）では、**サーバー発行トークンフロー**を推奨します。
バックエンドがアプリシークレットを保持し、`X-App-Key` + `X-App-Secret` を付けて
`POST /v1/server/challenge/issue` を呼び出してワンタイムの `server_token`（TTL 5 分）を発行し、
そのトークンをブラウザに渡します。ブラウザは `serverToken` を指定してウィジェットを描画します:

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

`@if` ブロック構文には Angular 17 が必要です。Angular 16 では `*ngIf` を使ってください。

バックエンドエンドポイントの例（Express / Node.js）:

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

注意:
- `X-App-Secret` をブラウザのコードに埋め込まないでください。
- 各 `server_token` は 1 回しか使用できません。ウィジェットをマウントするたびに再発行してください。
- `server_token_required=false` のレガシーアプリでは、引き続き公開 `appKey` のみのフローを使用できます。

## サーバーサイド検証

`success` でトークンを受け取ったら、サーバー側で検証します:

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

## TypeScript サポート

TypeScript に完全対応しています:

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

## サンプル

ルーティング付きの小さな Angular アプリが [`example/`](./example) にあります。まずライブラリを
ビルドし（`npm install && npm run build`）、次に `example/` で `npm install && npm start` を実行して
`http://localhost:4200/?appKey=your-app-key` を開いてください。

## ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照してください。

## リンク

- [Web サイト](https://captcha.la)
- [ドキュメント](https://docs.captcha.la/sdk/web)
- [ダッシュボード](https://dash.captcha.la)
