import { AfterViewInit, EventEmitter, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import type { CaptchalaInstance, CaptchalaProduct, CaptchalaResult, CaptchalaServerTokenHandler } from './types';
import * as i0 from "@angular/core";
/**
 * CaptchaLa CAPTCHA widget.
 *
 * ```html
 * <captchala appKey="your-app-key" (success)="onSuccess($event)" (error)="onError($event)" />
 * ```
 *
 * Nothing but an empty container is rendered on the server; the SDK
 * is loaded from the CDN when the component first renders in the browser.
 */
export declare class CaptchalaComponent implements AfterViewInit, OnChanges, OnDestroy {
    private readonly zone;
    /** Your public CaptchaLa app key. */
    appKey: string;
    /** Display mode. */
    product: CaptchalaProduct;
    /** Business scene, e.g. `'login'`. */
    action: string;
    /** Language code. Unset = the browser language. Changing it switches language in place. */
    lang?: string;
    /** Element or selector to bind to (only for `product="bind"`). */
    bindTo?: string | HTMLElement;
    /**
     * One-time server_token issued by your backend via POST /v1/server/challenge/issue
     * (with X-App-Key + X-App-Secret). Mandatory when the app has
     * `server_token_required=true`.
     */
    serverToken?: string;
    /** Called when `serverToken` is rejected; return a new token to retry once, or null. */
    onServerTokenExpired?: CaptchalaServerTokenHandler;
    /** Theme: preset string or `{ custom: { brightness: 'light' | 'dark' | 'system', ... } }`. */
    theme?: any;
    /** Verification passed. Send `$event.token` to your backend. */
    readonly success: EventEmitter<CaptchalaResult>;
    /**
     * The pass token of the last success expired before it was used. Fires once,
     * instead of `error`, only when you listen to it. The widget shows the expiry
     * either way; call `reset()` then `verify()` for a new verification.
     */
    readonly expired: EventEmitter<void>;
    /** Loading or verification failed. */
    readonly error: EventEmitter<any>;
    /** The challenge panel was closed. */
    readonly close: EventEmitter<void>;
    /** The widget is ready. */
    readonly ready: EventEmitter<void>;
    private mount;
    private instance;
    private viewReady;
    private destroyed;
    private initSeq;
    private reinitTimer;
    private readonly isBrowser;
    constructor(zone: NgZone, platformId: object);
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    /** Opens the challenge (popup / bind modes). */
    verify(): void;
    /** Resets the widget state. */
    reset(): void;
    /** Destroys the SDK instance. The component re-creates it when a key input changes. */
    destroy(): void;
    /** Binds the challenge to an element (bind mode). */
    bind(target: string | HTMLElement): void;
    /** Switches the language in place. */
    setLang(lang: string): void;
    /** The raw SDK instance, or null before it is ready. */
    getInstance(): CaptchalaInstance | null;
    private teardown;
    private emit;
    private init;
    static ɵfac: i0.ɵɵFactoryDeclaration<CaptchalaComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<CaptchalaComponent, "captchala", never, { "appKey": { "alias": "appKey"; "required": true; }; "product": { "alias": "product"; "required": false; }; "action": { "alias": "action"; "required": false; }; "lang": { "alias": "lang"; "required": false; }; "bindTo": { "alias": "bindTo"; "required": false; }; "serverToken": { "alias": "serverToken"; "required": false; }; "onServerTokenExpired": { "alias": "onServerTokenExpired"; "required": false; }; "theme": { "alias": "theme"; "required": false; }; }, { "success": "success"; "expired": "expired"; "error": "error"; "close": "close"; "ready": "ready"; }, never, never, true, never>;
}
