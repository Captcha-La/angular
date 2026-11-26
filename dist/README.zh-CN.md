# @captcha-la/angular

[English](https://github.com/Captcha-La/angular/blob/main/README.md) · **简体中文** · [日本語](https://github.com/Captcha-La/angular/blob/main/README.ja.md) · [한국어](https://github.com/Captcha-La/angular/blob/main/README.ko.md) · [Español](https://github.com/Captcha-La/angular/blob/main/README.es.md) · [Português (BR)](https://github.com/Captcha-La/angular/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/Captcha-La/angular/blob/main/README.de.md)

Captchala 验证码 Angular 官方组件 —— 为你的 Angular 应用提供智能 CAPTCHA 防护。

[![npm version](https://img.shields.io/npm/v/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![npm downloads](https://img.shields.io/npm/dm/@captcha-la/angular.svg)](https://www.npmjs.com/package/@captcha-la/angular)
[![license](https://img.shields.io/npm/l/@captcha-la/angular.svg)](https://github.com/Captcha-La/angular/blob/main/LICENSE)

- 独立（standalone）组件，无需 NgModule
- `injectCaptchala()`：在你自己的按钮上发起验证（bind 模式），状态以 signal 提供
- 支持 Angular 16 及以上，zone.js 与 zoneless 均可，支持服务端渲染
- 运行时从 CDN 加载验证码 SDK，始终获得最新防护

## 安装

```bash
npm install @captcha-la/angular
# or
yarn add @captcha-la/angular
# or
pnpm add @captcha-la/angular
```

## 快速上手

### 组件方式

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
    console.log('验证成功')
    console.log('Token:', result.token)
    // 把 token 提交到你自己的后端校验
  }

  onError(err: unknown) {
    console.error(err)
  }
}
```

使用 NgModule 时，把 `CaptchalaComponent` 加到模块的 `imports` 中即可。

### `injectCaptchala()` 方式

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
      <button type="submit" [disabled]="!captcha.ready()">登录</button>
    </form>
  `
})
export class LoginFormComponent {
  // 随组件一起自动销毁
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
      // 继续提交表单
    } catch (err) {
      console.error('验证失败:', err)
    }
  }
}
```

## 输入属性（Inputs）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `appKey` | `string` | *必填* | 你的 Captchala 应用 Key |
| `serverToken` | `string` | - | 由服务端签发的一次性挑战 token。应用开启 `server_token_required=true` 时必填。见下方 [生产环境：使用 serverToken](#生产环境使用-servertoken) |
| `product` | `'popup' \| 'float' \| 'embed' \| 'bind'` | `'popup'` | 显示模式 |
| `action` | `string` | `'default'` | 业务场景标识（如 'login'、'register'、'checkout'） |
| `lang` | `string` | 浏览器语言 | 语言代码（`'zh-CN'`、`'en'`、`'ja'` 等）；不设置则跟随浏览器语言。修改后原地切换语言 |
| `theme` | `string \| object` | - | 预设名或 `{ custom: { brightness: 'light' \| 'dark' \| 'system', ... } }`；不设置则跟随系统 |
| `bindTo` | `string \| HTMLElement` | - | 绑定的元素或选择器（仅 `product="bind"`） |
| `onServerTokenExpired` | `() => Promise<string \| null> \| string \| null` | - | `serverToken` 被拒绝时调用。返回新 token 会重试一次，返回 `null` 则抛出错误 |

修改 `appKey`、`product`、`action`、`bindTo`、`serverToken` 或 `theme` 会重建组件实例。

## 输出事件（Outputs）

| 事件 | 参数 | 说明 |
|------|------|------|
| `success` | `CaptchalaResult`（`{ token, type, action }`） | 验证成功 |
| `error` | `error` | 加载或验证失败 |
| `close` | - | 验证码被关闭 |
| `expired` | - | pass token 在使用前已过期（只触发一次；有监听时代替 `error`；组件会显示已过期）。见 [Token 过期](#token-过期) |
| `ready` | - | 验证码就绪 |

## 调用方法（模板引用变量或 `viewChild`）

```ts
@Component({
  standalone: true,
  imports: [CaptchalaComponent],
  template: `
    <captchala #captcha appKey="your-app-key" />
    <button (click)="captcha.verify()">验证</button>
  `
})
export class AppComponent {}
```

| 方法 | 说明 |
|------|------|
| `verify()` | 触发验证 |
| `reset()` | 重置验证码状态 |
| `destroy()` | 销毁验证码实例 |
| `bind(selector)` | 绑定到元素（'bind' 模式）。因 `bindTo` 已是输入属性，方法名为 `bind` |
| `setLang(lang)` | 原地切换语言 |
| `getInstance()` | 底层 SDK 实例 |

## `injectCaptchala()` / `CaptchalaService`

```ts
const {
  ready,      // Signal<boolean> - SDK 已加载并就绪
  loading,    // Signal<boolean> - SDK 加载中
  error,      // Signal<Error | null> - 加载或配置错误
  verify,     // () => Promise<CaptchalaResult> - 触发验证
  reset,      // () => void - 重置状态
  bindTo,     // (selector) => void - 绑定到元素
  appendTo,   // (selector) => void - 挂载到元素
  setLang,    // (lang) => void - 切换语言
  destroy     // () => void - 销毁（injectCaptchala 会自动处理）
} = injectCaptchala(options)
```

`injectCaptchala()` 必须在注入上下文（构造函数或字段初始化）中调用，会随创建它的
组件或服务一起销毁。其他场景请用 `inject(CaptchalaService).create(options)`，并自行
调用 `destroy()`。`CaptchalaService.load()` 可提前加载 SDK。

## Token 过期

`success` 给出的 pass token 有效期有限。如果用户等待太久才提交，组件会显示验证已过期
（滑条或复选框提示重新验证；`bind` 模式下按钮是你自己的，所以不显示），并触发一次
`expired`，代替 `error`。其余行为由你决定，例如显示自己的提示，再调用 `reset()` 和
`verify()` 发起新的验证（与其他验证码组件中 `expired-callback` + `reset()` +
`execute()` 的用法相同）：

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
      <p>验证已过期。<button (click)="expired.set(false); captcha.reset(); captcha.verify()">重新验证</button></p>
    }
  `
})
export class FormComponent {
  token = signal('')
  expired = signal(false)
}
```

没有 `(expired)` 监听时，与之前一样触发一次 `error`（class 为 `expired`）。离线或降级
token 不会触发 `expired`。`injectCaptchala({ onExpired })` 用法相同。

## 显示模式

### Popup 模式（默认）
显示一个按钮，点击后弹出验证码对话框。

```html
<captchala appKey="your-key" product="popup" />
```

### Float 模式
在页面内显示浮动的验证码组件。

```html
<captchala appKey="your-key" product="float" />
```

### Embed 模式
将验证码直接嵌入页面。

```html
<captchala appKey="your-key" product="embed" />
```

### Bind 模式（配合 `injectCaptchala()`）
最适合表单提交场景——用户提交时再验证。见上方 [`injectCaptchala()` 方式](#injectcaptchala-方式)。

## 服务端渲染

组件在服务端不渲染任何内容，只在浏览器中、视图创建之后加载 SDK。`injectCaptchala()`
在服务端保持空闲（`ready()` 为 `false`，`verify()` 会 reject）。Angular SSR 与预渲染
无需额外配置。

## 生产环境：使用 `serverToken`

生产环境（登录、注册、支付等）推荐使用 **服务端签发 token 流程**。你的后端持有 app
secret，带上 `X-App-Key` + `X-App-Secret` 调用 `POST /v1/server/challenge/issue`
生成一次性 `server_token`（有效期 5 分钟），再交给浏览器。浏览器用 `serverToken`
渲染组件：

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
      <div>加载中...</div>
    }
  `
})
export class LoginPageComponent {
  serverToken = signal<string | undefined>(undefined)

  constructor() {
    // 你自己的后端接口，内部代理 /v1/server/challenge/issue
    inject(HttpClient)
      .get<{ server_token: string }>('/api/captcha-token')
      .subscribe((d) => this.serverToken.set(d.server_token))
  }

  onSuccess(passToken: string) {
    console.log('pass_token:', passToken)
  }
}
```

`@if` 块语法需要 Angular 17；Angular 16 请使用 `*ngIf`。

后端接口示例（Express / Node.js）：

```js
// server.js — 在你自己的 /api/captcha-token 处理函数中调用
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

注意：
- 永远不要把 `X-App-Secret` 写进浏览器代码。
- 每个 `server_token` 只能使用一次，每次挂载组件前重新获取。
- `server_token_required=false` 的旧应用仍可只用公开 `appKey` 接入。

## 服务端校验

从 `success` 拿到 token 后，在你的服务端校验：

```js
// 你的后端
const response = await fetch('https://verify.captcha.la/v1/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Key': process.env.CAPTCHALA_APP_KEY,
    'X-App-Secret': process.env.CAPTCHALA_APP_SECRET
  },
  // pass_token = (success) 返回的 result.token；client_ip 可选但推荐传
  body: JSON.stringify({ pass_token: token, client_ip: req.ip })
})

const result = await response.json()
if (result.code === 0 && result.data.valid === true) {
  // token 有效，继续处理请求
}
```

## TypeScript 支持

内置完整的 TypeScript 类型：

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

## 示例

[`example/`](./example) 目录是一个带路由的小型 Angular 应用。先构建库
（`npm install && npm run build`），再在 `example/` 中运行 `npm install && npm start`，
打开 `http://localhost:4200/?appKey=your-app-key`。

## 开源协议

MIT License - 详见 [LICENSE](./LICENSE)。

## 链接

- [官网](https://captcha.la)
- [文档](https://docs.captcha.la/sdk/web)
- [控制台](https://dash.captcha.la)
