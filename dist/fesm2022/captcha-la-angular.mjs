import * as i0 from '@angular/core';
import { EventEmitter, PLATFORM_ID, Component, ChangeDetectionStrategy, Inject, Input, Output, ViewChild, signal, Injectable, inject, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Loads the CaptchaLa web SDK from the CDN.
 *
 * The core SDK is CDN-only so it can be updated in real time. This module
 * injects the small loader script (`captchala-loader.js`), which in turn loads
 * the SDK with its own host fallback, and resolves once `window.Captchala`
 * exists. Safe to call many times: concurrent calls share one load.
 */
const LOADER_HOSTS = ['cdn.captcha-cdn.net', 'cdn.captchala.com'];
const LOADER_PATH = '/captchala-loader.js';
const LOADER_TIMEOUT = 10000;
let pending = null;
function win() {
    return typeof window === 'undefined' ? undefined : window;
}
function toError(err, fallback) {
    if (err instanceof Error)
        return err;
    if (typeof err === 'string' && err)
        return new Error(err);
    return new Error(fallback);
}
/** Waits for a loader script that the page added itself (for example in index.html). */
function waitForExistingLoader() {
    return new Promise((resolve) => {
        const started = Date.now();
        const timer = setInterval(() => {
            const w = win();
            if (w.Captchala || typeof w.loadCaptchala === 'function') {
                clearInterval(timer);
                resolve(true);
            }
            else if (Date.now() - started >= LOADER_TIMEOUT) {
                clearInterval(timer);
                resolve(false);
            }
        }, 50);
    });
}
function injectLoader(index) {
    return new Promise((resolve, reject) => {
        if (index >= LOADER_HOSTS.length) {
            reject(new Error('Failed to load the Captchala loader from all CDN hosts'));
            return;
        }
        const script = document.createElement('script');
        script.src = `https://${LOADER_HOSTS[index]}${LOADER_PATH}`;
        script.async = true;
        let settled = false;
        const next = () => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            script.onload = script.onerror = null;
            if (script.parentNode)
                script.parentNode.removeChild(script);
            injectLoader(index + 1).then(resolve, reject);
        };
        const timer = setTimeout(next, LOADER_TIMEOUT);
        script.onerror = next;
        script.onload = () => {
            if (settled)
                return;
            if (typeof win().loadCaptchala !== 'function' && !win().Captchala) {
                next();
                return;
            }
            settled = true;
            clearTimeout(timer);
            script.onload = script.onerror = null;
            resolve();
        };
        document.head.appendChild(script);
    });
}
async function ensureLoader() {
    const w = win();
    if (w.Captchala || typeof w.loadCaptchala === 'function')
        return;
    if (document.querySelector('script[src*="captchala-loader.js"]')) {
        if (await waitForExistingLoader())
            return;
    }
    await injectLoader(0);
}
/**
 * Loads the SDK once. Resolves when `window.Captchala` is available.
 * Rejects outside a browser (SSR) and when every CDN host failed; a later call
 * tries again.
 */
function loadCaptchalaSDK() {
    const w = win();
    if (!w || typeof document === 'undefined') {
        return Promise.reject(new Error('Captchala can only be loaded in a browser'));
    }
    if (w.Captchala)
        return Promise.resolve();
    if (!pending) {
        pending = ensureLoader()
            .then(() => new Promise((resolve, reject) => {
            if (w.Captchala) {
                resolve();
                return;
            }
            w.loadCaptchala(() => resolve(), (err) => reject(toError(err, 'Failed to load the Captchala SDK')));
        }))
            .catch((err) => {
            pending = null;
            throw toError(err, 'Failed to load the Captchala SDK');
        });
    }
    return pending;
}
/** True once the SDK is available on the page. */
function isCaptchalaLoaded() {
    const w = win();
    return !!(w && w.Captchala);
}

/** Inputs that rebuild the widget when they change. `lang` is switched in place instead. */
const REINIT_INPUTS = ['appKey', 'product', 'action', 'bindTo', 'serverToken', 'theme'];
function hasListeners(emitter) {
    const e = emitter;
    return typeof e.observed === 'boolean' ? e.observed : (e.observers?.length ?? 0) > 0;
}
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
class CaptchalaComponent {
    constructor(zone, platformId) {
        this.zone = zone;
        /** Display mode. */
        this.product = 'popup';
        /** Business scene, e.g. `'login'`. */
        this.action = 'default';
        /** Verification passed. Send `$event.token` to your backend. */
        this.success = new EventEmitter();
        /**
         * The pass token of the last success expired before it was used. Fires once,
         * instead of `error`, only when you listen to it. The widget shows the expiry
         * either way; call `reset()` then `verify()` for a new verification.
         */
        this.expired = new EventEmitter();
        /** Loading or verification failed. */
        this.error = new EventEmitter();
        /** The challenge panel was closed. */
        this.close = new EventEmitter();
        /** The widget is ready. */
        this.ready = new EventEmitter();
        this.instance = null;
        this.viewReady = false;
        this.destroyed = false;
        this.initSeq = 0;
        this.reinitTimer = null;
        this.isBrowser = isPlatformBrowser(platformId);
    }
    ngAfterViewInit() {
        this.viewReady = true;
        if (this.isBrowser)
            this.init();
    }
    ngOnChanges(changes) {
        if (!this.viewReady || !this.isBrowser)
            return;
        if (REINIT_INPUTS.some((k) => changes[k] && !changes[k].firstChange)) {
            if (this.reinitTimer)
                clearTimeout(this.reinitTimer);
            this.reinitTimer = setTimeout(() => {
                this.reinitTimer = null;
                this.init();
            }, 100);
        }
        else if (changes['lang'] && !changes['lang'].firstChange && this.lang) {
            this.instance?.setLang?.(this.lang);
        }
    }
    ngOnDestroy() {
        this.destroyed = true;
        if (this.reinitTimer)
            clearTimeout(this.reinitTimer);
        this.teardown();
    }
    /** Opens the challenge (popup / bind modes). */
    verify() {
        this.instance?.verify();
    }
    /** Resets the widget state. */
    reset() {
        this.instance?.reset();
    }
    /** Destroys the SDK instance. The component re-creates it when a key input changes. */
    destroy() {
        this.teardown();
    }
    /** Binds the challenge to an element (bind mode). */
    bind(target) {
        this.instance?.bindTo(target);
    }
    /** Switches the language in place. */
    setLang(lang) {
        this.instance?.setLang?.(lang);
    }
    /** The raw SDK instance, or null before it is ready. */
    getInstance() {
        return this.instance;
    }
    teardown() {
        if (this.instance) {
            const inst = this.instance;
            this.instance = null;
            try {
                inst.destroy();
            }
            catch {
                // already gone
            }
        }
    }
    emit(emitter, value) {
        this.zone.run(() => emitter.emit(value));
    }
    async init() {
        const seq = ++this.initSeq;
        try {
            // Load and run the SDK outside Angular so its timers and animations
            // do not trigger change detection; events re-enter the zone.
            await this.zone.runOutsideAngular(() => loadCaptchalaSDK());
            if (this.destroyed || seq !== this.initSeq)
                return;
            const Captchala = window.Captchala;
            const el = this.mount?.nativeElement;
            if (!Captchala || !el)
                return;
            this.zone.runOutsideAngular(() => {
                this.teardown();
                while (el.firstChild)
                    el.removeChild(el.firstChild);
                const handler = this.onServerTokenExpired;
                const inst = Captchala.init({
                    appKey: this.appKey,
                    product: this.product,
                    action: this.action,
                    lang: this.lang,
                    theme: this.theme,
                    serverToken: this.serverToken,
                    onServerTokenExpired: handler ? () => handler() ?? null : undefined
                });
                inst
                    .onReady(() => this.emit(this.ready))
                    .onSuccess((result) => this.emit(this.success, result))
                    .onError((err) => this.emit(this.error, err))
                    .onClose(() => this.emit(this.close));
                // Registered only with a listener: without one the SDK reports expiry via onError.
                if (hasListeners(this.expired) && typeof inst.onExpired === 'function') {
                    inst.onExpired(() => this.emit(this.expired));
                }
                if (this.product === 'bind') {
                    if (this.bindTo)
                        inst.bindTo(this.bindTo);
                }
                else {
                    inst.appendTo(el);
                }
                this.instance = inst;
            });
        }
        catch (err) {
            if (!this.destroyed)
                this.emit(this.error, err);
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaComponent, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.2.12", type: CaptchalaComponent, isStandalone: true, selector: "captchala", inputs: { appKey: "appKey", product: "product", action: "action", lang: "lang", bindTo: "bindTo", serverToken: "serverToken", onServerTokenExpired: "onServerTokenExpired", theme: "theme" }, outputs: { success: "success", expired: "expired", error: "error", close: "close", ready: "ready" }, host: { properties: { "class.captchala-container--bind": "product === 'bind'" }, classAttribute: "captchala-container" }, viewQueries: [{ propertyName: "mount", first: true, predicate: ["mount"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: '<div #mount class="captchala-mount"></div>', isInline: true, styles: [":host{display:block;min-height:50px}\n", ".captchala-mount{width:100%}\n", ":host(.captchala-container--bind){min-height:0;position:absolute;width:0;height:0;overflow:hidden}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaComponent, decorators: [{
            type: Component,
            args: [{ selector: 'captchala', standalone: true, template: '<div #mount class="captchala-mount"></div>', changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        class: 'captchala-container',
                        '[class.captchala-container--bind]': "product === 'bind'"
                    }, styles: [":host{display:block;min-height:50px}\n", ".captchala-mount{width:100%}\n", ":host(.captchala-container--bind){min-height:0;position:absolute;width:0;height:0;overflow:hidden}\n"] }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }]; }, propDecorators: { appKey: [{
                type: Input,
                args: [{ required: true }]
            }], product: [{
                type: Input
            }], action: [{
                type: Input
            }], lang: [{
                type: Input
            }], bindTo: [{
                type: Input
            }], serverToken: [{
                type: Input
            }], onServerTokenExpired: [{
                type: Input
            }], theme: [{
                type: Input
            }], success: [{
                type: Output
            }], expired: [{
                type: Output
            }], error: [{
                type: Output
            }], close: [{
                type: Output
            }], ready: [{
                type: Output
            }], mount: [{
                type: ViewChild,
                args: ['mount', { static: true }]
            }] } });

function normalizeError(err) {
    if (err instanceof Error)
        return err;
    if (typeof err === 'string')
        return new Error(err);
    if (err && typeof err === 'object') {
        const e = new Error(err.message || err.error || 'Verification failed');
        e.cause = err;
        return e;
    }
    return new Error('Verification failed');
}
class CaptchalaService {
    constructor(zone, platformId) {
        this.zone = zone;
        this.isBrowser = isPlatformBrowser(platformId);
    }
    /** Loads the SDK from the CDN (browser only). */
    load() {
        return this.zone.runOutsideAngular(() => loadCaptchalaSDK());
    }
    /** True once the SDK is available on the page. */
    isLoaded() {
        return isCaptchalaLoaded();
    }
    /**
     * Creates a widget without a template, like the React `useCaptchala` hook.
     * Call `destroy()` when you are done, or use `injectCaptchala()` which does it for you.
     * On the server the handle stays idle and `verify()` rejects.
     */
    create(options) {
        const zone = this.zone;
        const ready = signal(false);
        const loading = signal(this.isBrowser);
        const error = signal(null);
        let inst = null;
        let destroyed = false;
        let pending = null;
        const settle = (fn) => {
            const p = pending;
            pending = null;
            if (p)
                zone.run(() => fn(p));
        };
        if (this.isBrowser) {
            this.load()
                .then(() => {
                if (destroyed)
                    return;
                zone.runOutsideAngular(() => {
                    const handler = options.onServerTokenExpired;
                    inst = window.Captchala.init({
                        appKey: options.appKey,
                        product: options.product || 'popup',
                        action: options.action || 'default',
                        lang: options.lang,
                        theme: options.theme,
                        serverToken: options.serverToken,
                        onServerTokenExpired: handler ? () => handler() ?? null : undefined
                    });
                    inst
                        .onReady(() => zone.run(() => {
                        ready.set(true);
                        loading.set(false);
                    }))
                        .onSuccess((result) => settle((p) => p.resolve(result)))
                        .onError((err) => {
                        if (pending) {
                            settle((p) => p.reject(normalizeError(err)));
                        }
                        else if (!ready()) {
                            // Failed before it became ready (for example a configuration error).
                            zone.run(() => {
                                error.set(normalizeError(err));
                                loading.set(false);
                            });
                        }
                    });
                    const onExpired = options.onExpired;
                    if (onExpired && typeof inst.onExpired === 'function') {
                        inst.onExpired(() => zone.run(() => onExpired()));
                    }
                });
            })
                .catch((err) => {
                if (destroyed)
                    return;
                zone.run(() => {
                    error.set(normalizeError(err));
                    loading.set(false);
                });
            });
        }
        return {
            ready: ready.asReadonly(),
            loading: loading.asReadonly(),
            error: error.asReadonly(),
            verify: () => new Promise((resolve, reject) => {
                if (!inst)
                    return reject(new Error('Captcha not initialized'));
                if (pending)
                    return reject(new Error('Verification already in progress'));
                pending = { resolve, reject };
                try {
                    zone.runOutsideAngular(() => inst.verify());
                }
                catch (e) {
                    pending = null;
                    reject(normalizeError(e));
                }
            }),
            reset: () => inst?.reset(),
            bindTo: (target) => inst?.bindTo(target),
            appendTo: (target) => inst?.appendTo(target),
            setLang: (lang) => inst?.setLang?.(lang),
            destroy: () => {
                destroyed = true;
                settle((p) => p.reject(new Error('Captcha destroyed')));
                if (inst) {
                    try {
                        inst.destroy();
                    }
                    catch {
                        // already gone
                    }
                    inst = null;
                }
                ready.set(false);
            },
            instance: () => inst
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaService, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }]; } });
/**
 * Creates a widget bound to the current component or service; it is destroyed
 * with it. Call in an injection context (constructor or field initializer).
 *
 * ```ts
 * captcha = injectCaptchala({ appKey: 'your-app-key', product: 'bind', action: 'login' })
 * async submit() { const { token } = await this.captcha.verify() }
 * ```
 */
function injectCaptchala(options) {
    const handle = inject(CaptchalaService).create(options);
    inject(DestroyRef).onDestroy(() => handle.destroy());
    return handle;
}

/**
 * Generated bundle index. Do not edit.
 */

export { CaptchalaComponent, CaptchalaService, injectCaptchala, isCaptchalaLoaded, loadCaptchalaSDK };
//# sourceMappingURL=captcha-la-angular.mjs.map
