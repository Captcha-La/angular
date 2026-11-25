import { Component, signal } from '@angular/core'
import { CaptchalaComponent, injectCaptchala, type CaptchalaResult } from '@captcha-la/angular'

// Pass ?appKey=...&serverToken=... in the URL, or edit the defaults below.
const params = new URLSearchParams(location.search)
const APP_KEY = params.get('appKey') || 'YOUR_APP_KEY'
const SERVER_TOKEN = params.get('serverToken') || undefined

@Component({
  selector: 'app-captcha-page',
  imports: [CaptchalaComponent],
  template: `
    <section class="box">
      <h2>Component (float mode)</h2>
      <captchala
        #captcha
        id="widget"
        [appKey]="appKey"
        product="float"
        action="login"
        [lang]="lang()"
        [serverToken]="serverToken"
        (ready)="log('ready')"
        (success)="onSuccess($event)"
        (expired)="log('expired')"
        (error)="log('error', $event)"
        (close)="log('close')"
      />
      <button id="lang-ja" (click)="lang.set('ja')">Language: ja</button>
      <button id="lang-en" (click)="lang.set('en')">Language: en</button>
      <button id="reset" (click)="captcha.reset()">Reset</button>
      <p>Token: <code id="token">{{ token() || '-' }}</code></p>
    </section>

    <section class="box">
      <h2>injectCaptchala (bind mode)</h2>
      <button id="submit" [disabled]="!bind.ready()" (click)="submit()">Sign in</button>
      <span id="bind-state">{{ bind.error() ? 'error: ' + bind.error()!.message : bind.loading() ? 'loading' : bind.ready() ? 'ready' : 'idle' }}</span>
    </section>

    <pre id="events">{{ events().join('\\n') }}</pre>
  `
})
export class CaptchaPageComponent {
  readonly appKey = APP_KEY
  readonly serverToken = SERVER_TOKEN
  readonly lang = signal('en')
  readonly token = signal('')
  readonly events = signal<string[]>([])

  readonly bind = injectCaptchala({ appKey: APP_KEY, product: 'bind', action: 'login' })

  log(name: string, detail?: unknown): void {
    const text = detail === undefined ? name : `${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
    this.events.update((list) => [...list, text])
  }

  onSuccess(result: CaptchalaResult): void {
    this.token.set(result.token)
    this.log('success')
  }

  async submit(): Promise<void> {
    try {
      const { token } = await this.bind.verify()
      this.log('bind success: ' + token.slice(0, 8))
    } catch (err) {
      this.log('bind error', (err as Error).message)
    }
  }
}
