import { NgZone, Signal } from '@angular/core';
import type { CaptchalaInstance, CaptchalaOptions, CaptchalaResult } from './types';
import * as i0 from "@angular/core";
export interface CaptchalaHandleOptions extends CaptchalaOptions {
    /**
     * Called once when the pass token of the last success expires before it was used.
     * The widget shows the expiry either way; call `reset()` then `verify()` for a new
     * verification. Without it the SDK reports the expiry through the error path.
     */
    onExpired?: () => void;
}
/** A programmatic widget, for example to verify on your own submit button. */
export interface CaptchalaHandle {
    /** The SDK is loaded and the widget is ready. */
    readonly ready: Signal<boolean>;
    /** The SDK is loading. */
    readonly loading: Signal<boolean>;
    /** Loading error, if any. */
    readonly error: Signal<Error | null>;
    /** Starts a verification; resolves with the result or rejects with an Error. */
    verify(): Promise<CaptchalaResult>;
    reset(): void;
    bindTo(target: string | HTMLElement): void;
    appendTo(target: string | HTMLElement): void;
    setLang(lang: string): void;
    /** Destroys the SDK instance. Called for you by `injectCaptchala()`. */
    destroy(): void;
    /** The raw SDK instance, or null before it is ready. */
    instance(): CaptchalaInstance | null;
}
export declare class CaptchalaService {
    private readonly zone;
    private readonly isBrowser;
    constructor(zone: NgZone, platformId: object);
    /** Loads the SDK from the CDN (browser only). */
    load(): Promise<void>;
    /** True once the SDK is available on the page. */
    isLoaded(): boolean;
    /**
     * Creates a widget without a template, like the React `useCaptchala` hook.
     * Call `destroy()` when you are done, or use `injectCaptchala()` which does it for you.
     * On the server the handle stays idle and `verify()` rejects.
     */
    create(options: CaptchalaHandleOptions): CaptchalaHandle;
    static ɵfac: i0.ɵɵFactoryDeclaration<CaptchalaService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<CaptchalaService>;
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
export declare function injectCaptchala(options: CaptchalaHandleOptions): CaptchalaHandle;
