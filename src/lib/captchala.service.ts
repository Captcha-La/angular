import {
  DestroyRef,
  Inject,
  Injectable,
  NgZone,
  PLATFORM_ID,
  Signal,
  inject,
  signal
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { isCaptchalaLoaded, loadCaptchalaSDK } from './loader'
import type { CaptchalaInstance, CaptchalaOptions, CaptchalaResult } from './types'

export interface CaptchalaHandleOptions extends CaptchalaOptions {
  /**
   * Called once when the pass token of the last success expires before it was used.
   * The widget shows the expiry either way; call `reset()` then `verify()` for a new
   * verification. Without it the SDK reports the expiry through the error path.
   */
  onExpired?: () => void
}

/** A programmatic widget, for example to verify on your own submit button. */
export interface CaptchalaHandle {
  /** The SDK is loaded and the widget is ready. */
  readonly ready: Signal<boolean>
  /** The SDK is loading. */
  readonly loading: Signal<boolean>
  /** Loading error, if any. */
  readonly error: Signal<Error | null>
  /** Starts a verification; resolves with the result or rejects with an Error. */
  verify(): Promise<CaptchalaResult>
  reset(): void
  bindTo(target: string | HTMLElement): void
  appendTo(target: string | HTMLElement): void
  setLang(lang: string): void
  /** Destroys the SDK instance. Called for you by `injectCaptchala()`. */
  destroy(): void
  /** The raw SDK instance, or null before it is ready. */
  instance(): CaptchalaInstance | null
}

function normalizeError(err: any): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  if (err && typeof err === 'object') {
    const e = new Error(err.message || err.error || 'Verification failed')
    ;(e as any).cause = err
    return e
  }
  return new Error('Verification failed')
}

@Injectable({ providedIn: 'root' })
export class CaptchalaService {
  private readonly isBrowser: boolean

  constructor(
    private readonly zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId)
  }

  /** Loads the SDK from the CDN (browser only). */
  load(): Promise<void> {
    return this.zone.runOutsideAngular(() => loadCaptchalaSDK())
  }

  /** True once the SDK is available on the page. */
  isLoaded(): boolean {
    return isCaptchalaLoaded()
  }

  /**
   * Creates a widget without a template, like the React `useCaptchala` hook.
   * Call `destroy()` when you are done, or use `injectCaptchala()` which does it for you.
   * On the server the handle stays idle and `verify()` rejects.
   */
  create(options: CaptchalaHandleOptions): CaptchalaHandle {
    const zone = this.zone
    const ready = signal(false)
    const loading = signal(this.isBrowser)
    const error = signal<Error | null>(null)
    let inst: CaptchalaInstance | null = null
    let destroyed = false
    let pending: { resolve: (r: CaptchalaResult) => void; reject: (e: Error) => void } | null = null

    const settle = (fn: (p: NonNullable<typeof pending>) => void) => {
      const p = pending
      pending = null
      if (p) zone.run(() => fn(p))
    }

    if (this.isBrowser) {
      this.load()
        .then(() => {
          if (destroyed) return
          zone.runOutsideAngular(() => {
            const handler = options.onServerTokenExpired
            inst = (window as any).Captchala.init({
              appKey: options.appKey,
              product: options.product || 'popup',
              action: options.action || 'default',
              lang: options.lang,
              theme: options.theme,
              serverToken: options.serverToken,
              onServerTokenExpired: handler ? () => handler() ?? null : undefined
            }) as CaptchalaInstance
            inst
              .onReady(() =>
                zone.run(() => {
                  ready.set(true)
                  loading.set(false)
                })
              )
              .onSuccess((result: CaptchalaResult) => settle((p) => p.resolve(result)))
              .onError((err: any) => {
                if (pending) {
                  settle((p) => p.reject(normalizeError(err)))
                } else if (!ready()) {
                  // Failed before it became ready (for example a configuration error).
                  zone.run(() => {
                    error.set(normalizeError(err))
                    loading.set(false)
                  })
                }
              })
            const onExpired = options.onExpired
            if (onExpired && typeof inst.onExpired === 'function') {
              inst.onExpired(() => zone.run(() => onExpired()))
            }
          })
        })
        .catch((err) => {
          if (destroyed) return
          zone.run(() => {
            error.set(normalizeError(err))
            loading.set(false)
          })
        })
    }

    return {
      ready: ready.asReadonly(),
      loading: loading.asReadonly(),
      error: error.asReadonly(),
      verify: () =>
        new Promise<CaptchalaResult>((resolve, reject) => {
          if (!inst) return reject(new Error('Captcha not initialized'))
          if (pending) return reject(new Error('Verification already in progress'))
          pending = { resolve, reject }
          try {
            zone.runOutsideAngular(() => inst!.verify())
          } catch (e: any) {
            pending = null
            reject(normalizeError(e))
          }
        }),
      reset: () => inst?.reset(),
      bindTo: (target) => inst?.bindTo(target),
      appendTo: (target) => inst?.appendTo(target),
      setLang: (lang) => inst?.setLang?.(lang),
      destroy: () => {
        destroyed = true
        settle((p) => p.reject(new Error('Captcha destroyed')))
        if (inst) {
          try {
            inst.destroy()
          } catch {
            // already gone
          }
          inst = null
        }
        ready.set(false)
      },
      instance: () => inst
    }
  }
}

/**
 * Creates a widget bound to the current component or service; it is destroyed
 * with it. Call in an injection context (constructor or field initializer).
 *
 * ```ts
 * captcha = injectCaptchala({ appKey: 'your-app-key', product: 'bind', action: 'login' })
 * async submit() { const { token } = await this.captcha.verify() }
 * ```
 */
export function injectCaptchala(options: CaptchalaHandleOptions): CaptchalaHandle {
  const handle = inject(CaptchalaService).create(options)
  inject(DestroyRef).onDestroy(() => handle.destroy())
  return handle
}
