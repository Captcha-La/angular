import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { loadCaptchalaSDK } from './loader'
import type {
  CaptchalaInstance,
  CaptchalaProduct,
  CaptchalaResult,
  CaptchalaServerTokenHandler
} from './types'

/** Inputs that rebuild the widget when they change. `lang` is switched in place instead. */
const REINIT_INPUTS = ['appKey', 'product', 'action', 'bindTo', 'serverToken', 'theme']

function hasListeners(emitter: EventEmitter<any>): boolean {
  const e = emitter as any
  return typeof e.observed === 'boolean' ? e.observed : (e.observers?.length ?? 0) > 0
}

/**
 * CaptchaLa CAPTCHA widget.
 *
 * ```html
 * <captchala appKey="your-app-key" (success)="onSuccess($event)" (error)="onError($event)" />
 * ```
 *
 * The host element is the mount point. Nothing is rendered on the server; the SDK
 * is loaded from the CDN when the component first renders in the browser.
 */
@Component({
  selector: 'captchala',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'captchala-container',
    '[class.captchala-container--bind]': "product === 'bind'"
  },
  styles: [
    ':host{display:block;min-height:50px}',
    ':host(.captchala-container--bind){min-height:0;position:absolute;width:0;height:0;overflow:hidden}'
  ]
})
export class CaptchalaComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Your public CaptchaLa app key. */
  @Input({ required: true }) appKey!: string
  /** Display mode. */
  @Input() product: CaptchalaProduct = 'popup'
  /** Business scene, e.g. `'login'`. */
  @Input() action = 'default'
  /** Language code. Unset = the browser language. Changing it switches language in place. */
  @Input() lang?: string
  /** Element or selector to bind to (only for `product="bind"`). */
  @Input() bindTo?: string | HTMLElement
  /**
   * One-time server_token issued by your backend via POST /v1/server/challenge/issue
   * (with X-App-Key + X-App-Secret). Mandatory when the app has
   * `server_token_required=true`.
   */
  @Input() serverToken?: string
  /** Called when `serverToken` is rejected; return a new token to retry once, or null. */
  @Input() onServerTokenExpired?: CaptchalaServerTokenHandler
  /** Theme: preset string or `{ custom: { brightness: 'light' | 'dark' | 'system', ... } }`. */
  @Input() theme?: any

  /** Verification passed. Send `$event.token` to your backend. */
  @Output() readonly success = new EventEmitter<CaptchalaResult>()
  /**
   * The pass token of the last success expired before it was used. Fires once,
   * instead of `error`, only when you listen to it. The widget shows the expiry
   * either way; call `reset()` then `verify()` for a new verification.
   */
  @Output() readonly expired = new EventEmitter<void>()
  /** Loading or verification failed. */
  @Output() readonly error = new EventEmitter<any>()
  /** The challenge panel was closed. */
  @Output() readonly close = new EventEmitter<void>()
  /** The widget is ready. */
  @Output() readonly ready = new EventEmitter<void>()

  private instance: CaptchalaInstance | null = null
  private viewReady = false
  private destroyed = false
  private initSeq = 0
  private reinitTimer: ReturnType<typeof setTimeout> | null = null
  private readonly isBrowser: boolean

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId)
  }

  ngAfterViewInit(): void {
    this.viewReady = true
    if (this.isBrowser) this.init()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady || !this.isBrowser) return
    if (REINIT_INPUTS.some((k) => changes[k] && !changes[k].firstChange)) {
      if (this.reinitTimer) clearTimeout(this.reinitTimer)
      this.reinitTimer = setTimeout(() => {
        this.reinitTimer = null
        this.init()
      }, 100)
    } else if (changes['lang'] && !changes['lang'].firstChange && this.lang) {
      this.instance?.setLang?.(this.lang)
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true
    if (this.reinitTimer) clearTimeout(this.reinitTimer)
    this.teardown()
  }

  /** Opens the challenge (popup / bind modes). */
  verify(): void {
    this.instance?.verify()
  }

  /** Resets the widget state. */
  reset(): void {
    this.instance?.reset()
  }

  /** Destroys the SDK instance. The component re-creates it when a key input changes. */
  destroy(): void {
    this.teardown()
  }

  /** Binds the challenge to an element (bind mode). */
  bind(target: string | HTMLElement): void {
    this.instance?.bindTo(target)
  }

  /** Switches the language in place. */
  setLang(lang: string): void {
    this.instance?.setLang?.(lang)
  }

  /** The raw SDK instance, or null before it is ready. */
  getInstance(): CaptchalaInstance | null {
    return this.instance
  }

  private teardown(): void {
    if (this.instance) {
      const inst = this.instance
      this.instance = null
      try {
        inst.destroy()
      } catch {
        // already gone
      }
    }
  }

  private emit<T>(emitter: EventEmitter<T>, value?: T): void {
    this.zone.run(() => emitter.emit(value as T))
  }

  private async init(): Promise<void> {
    const seq = ++this.initSeq
    try {
      // Load and run the SDK outside Angular so its timers and animations
      // do not trigger change detection; events re-enter the zone.
      await this.zone.runOutsideAngular(() => loadCaptchalaSDK())
      if (this.destroyed || seq !== this.initSeq) return
      const Captchala = (window as any).Captchala
      const el = this.host.nativeElement
      if (!Captchala || !el) return

      this.zone.runOutsideAngular(() => {
        this.teardown()
        while (el.firstChild) el.removeChild(el.firstChild)

        const handler = this.onServerTokenExpired
        const inst: CaptchalaInstance = Captchala.init({
          appKey: this.appKey,
          product: this.product,
          action: this.action,
          lang: this.lang,
          theme: this.theme,
          serverToken: this.serverToken,
          onServerTokenExpired: handler ? () => handler() ?? null : undefined
        })

        inst
          .onReady(() => this.emit(this.ready))
          .onSuccess((result: CaptchalaResult) => this.emit(this.success, result))
          .onError((err: any) => this.emit(this.error, err))
          .onClose(() => this.emit(this.close))
        // Registered only with a listener: without one the SDK reports expiry via onError.
        if (hasListeners(this.expired) && typeof inst.onExpired === 'function') {
          inst.onExpired(() => this.emit(this.expired))
        }

        if (this.product === 'bind') {
          if (this.bindTo) inst.bindTo(this.bindTo)
        } else {
          inst.appendTo(el)
        }
        this.instance = inst
      })
    } catch (err) {
      if (!this.destroyed) this.emit(this.error, err)
    }
  }
}
