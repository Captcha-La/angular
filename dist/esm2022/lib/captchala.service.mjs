import { DestroyRef, Inject, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isCaptchalaLoaded, loadCaptchalaSDK } from './loader';
import * as i0 from "@angular/core";
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
export class CaptchalaService {
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
export function injectCaptchala(options) {
    const handle = inject(CaptchalaService).create(options);
    inject(DestroyRef).onDestroy(() => handle.destroy());
    return handle;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwdGNoYWxhLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2NhcHRjaGFsYS5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxVQUFVLEVBQ1YsTUFBTSxFQUNOLFVBQVUsRUFFVixXQUFXLEVBRVgsTUFBTSxFQUNOLE1BQU0sRUFDUCxNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxVQUFVLENBQUE7O0FBZ0M5RCxTQUFTLGNBQWMsQ0FBQyxHQUFRO0lBQzlCLElBQUksR0FBRyxZQUFZLEtBQUs7UUFBRSxPQUFPLEdBQUcsQ0FBQTtJQUNwQyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFBRSxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xELElBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtRQUNsQyxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUkscUJBQXFCLENBQUMsQ0FDckU7UUFBQyxDQUFTLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUN2QixPQUFPLENBQUMsQ0FBQTtLQUNUO0lBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFHRCxNQUFNLE9BQU8sZ0JBQWdCO0lBRzNCLFlBQ21CLElBQVksRUFDUixVQUFrQjtRQUR0QixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELGlEQUFpRDtJQUNqRCxJQUFJO1FBQ0YsT0FBTyxJQUFJ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QztZQUNELFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3JCLENBQUE7SUFDSCxDQUFDOytHQTVIVSxnQkFBZ0Isd0NBS2pCLFdBQVc7bUhBTFYsZ0JBQWdCLGNBREgsTUFBTTs7NEZBQ25CLGdCQUFnQjtrQkFENUIsVUFBVTttQkFBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7OzBCQU03QixNQUFNOzJCQUFDLFdBQVc7O0FBMEh2Qjs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBK0I7SUFDN0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDcEQsT0FBTyxNQUFNLENBQUE7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgRGVzdHJveVJlZixcbiAgSW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBOZ1pvbmUsXG4gIFBMQVRGT1JNX0lELFxuICBTaWduYWwsXG4gIGluamVjdCxcbiAgc2lnbmFsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnXG5pbXBvcnQgeyBpc1BsYXRmb3JtQnJvd3NlciB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbidcbmltcG9ydCB7IGlzQ2FwdGNoYWxhTG9hZGVkLCBsb2FkQ2FwdGNoYWxhU0RLIH0gZnJvbSAnLi9sb2FkZXInXG5pbXBvcnQgdHlwZSB7IENhcHRjaGFsYUluc3RhbmNlLCBDYXB0Y2hhbGFPcHRpb25zLCBDYXB0Y2hhbGFSZXN1bHQgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIENhcHRjaGFsYUhhbmRsZU9wdGlvbnMgZXh0ZW5kcyBDYXB0Y2hhbGFPcHRpb25zIHtcbiAgLyoqXG4gICAqIENhbGxlZCBvbmNlIHdoZW4gdGhlIHBhc3MgdG9rZW4gb2YgdGhlIGxhc3Qgc3VjY2VzcyBleHBpcmVzIGJlZm9yZSBpdCB3YXMgdXNlZC5cbiAgICogVGhlIHdpZGdldCBzaG93cyB0aGUgZXhwaXJ5IGVpdGhlciB3YXk7IGNhbGwgYHJlc2V0KClgIHRoZW4gYHZlcmlmeSgpYCBmb3IgYSBuZXdcbiAgICogdmVyaWZpY2F0aW9uLiBXaXRob3V0IGl0IHRoZSBTREsgcmVwb3J0cyB0aGUgZXhwaXJ5IHRocm91Z2ggdGhlIGVycm9yIHBhdGguXG4gICAqL1xuICBvbkV4cGlyZWQ/OiAoKSA9PiB2b2lkXG59XG5cbi8qKiBBIHByb2dyYW1tYXRpYyB3aWRnZXQsIGZvciBleGFtcGxlIHRvIHZlcmlmeSBvbiB5b3VyIG93biBzdWJtaXQgYnV0dG9uLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYXB0Y2hhbGFIYW5kbGUge1xuICAvKiogVGhlIFNESyBpcyBsb2FkZWQgYW5kIHRoZSB3aWRnZXQgaXMgcmVhZHkuICovXG4gIHJlYWRvbmx5IHJlYWR5OiBTaWduYWw8Ym9vbGVhbj5cbiAgLyoqIFRoZSBTREsgaXMgbG9hZGluZy4gKi9cbiAgcmVhZG9ubHkgbG9hZGluZzogU2lnbmFsPGJvb2xlYW4+XG4gIC8qKiBMb2FkaW5nIGVycm9yLCBpZiBhbnkuICovXG4gIHJlYWRvbmx5IGVycm9yOiBTaWduYWw8RXJyb3IgfCBudWxsPlxuICAvKiogU3RhcnRzIGEgdmVyaWZpY2F0aW9uOyByZXNvbHZlcyB3aXRoIHRoZSByZXN1bHQgb3IgcmVqZWN0cyB3aXRoIGFuIEVycm9yLiAqL1xuICB2ZXJpZnkoKTogUHJvbWlzZTxDYXB0Y2hhbGFSZXN1bHQ+XG4gIHJlc2V0KCk6IHZvaWRcbiAgYmluZFRvKHRhcmdldDogc3RyaW5nIHwgSFRNTEVsZW1lbnQpOiB2b2lkXG4gIGFwcGVuZFRvKHRhcmdldDogc3RyaW5nIHwgSFRNTEVsZW1lbnQpOiB2b2lkXG4gIHNldExhbmcobGFuZzogc3RyaW5nKTogdm9pZFxuICAvKiogRGVzdHJveXMgdGhlIFNESyBpbnN0YW5jZS4gQ2FsbGVkIGZvciB5b3UgYnkgYGluamVjdENhcHRjaGFsYSgpYC4gKi9cbiAgZGVzdHJveSgpOiB2b2lkXG4gIC8qKiBUaGUgcmF3IFNESyBpbnN0YW5jZSwgb3IgbnVsbCBiZWZvcmUgaXQgaXMgcmVhZHkuICovXG4gIGluc3RhbmNlKCk6IENhcHRjaGFsYUluc3RhbmNlIHwgbnVsbFxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVFcnJvcihlcnI6IGFueSk6IEVycm9yIHtcbiAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gZXJyXG4gIGlmICh0eXBlb2YgZXJyID09PSAnc3RyaW5nJykgcmV0dXJuIG5ldyBFcnJvcihlcnIpXG4gIGlmIChlcnIgJiYgdHlwZW9mIGVyciA9PT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCBlID0gbmV3IEVycm9yKGVyci5tZXNzYWdlIHx8IGVyci5lcnJvciB8fCAnVmVyaWZpY2F0aW9uIGZhaWxlZCcpXG4gICAgOyhlIGFzIGFueSkuY2F1c2UgPSBlcnJcbiAgICByZXR1cm4gZVxuICB9XG4gIHJldHVybiBuZXcgRXJyb3IoJ1ZlcmlmaWNhdGlvbiBmYWlsZWQnKVxufVxuXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIENhcHRjaGFsYVNlcnZpY2Uge1xuICBwcml2YXRlIHJlYWRvbmx5IGlzQnJvd3NlcjogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgem9uZTogTmdab25lLFxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IG9iamVjdFxuICApIHtcbiAgICB0aGlzLmlzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpXG4gIH1cblxuICAvKiogTG9hZHMgdGhlIFNESyBmcm9tIHRoZSBDRE4gKGJyb3dzZXIgb25seSkuICovXG4gIGxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiBsb2FkQ2FwdGNoYWxhU0RLKCkpXG4gIH1cblxuICAvKiogVHJ1ZSBvbmNlIHRoZSBTREsgaXMgYXZhaWxhYmxlIG9uIHRoZSBwYWdlLiAqL1xuICBpc0xvYWRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNDYXB0Y2hhbGFMb2FkZWQoKVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB3aWRnZXQgd2l0aG91dCBhIHRlbXBsYXRlLCBsaWtlIHRoZSBSZWFjdCBgdXNlQ2FwdGNoYWxhYCBob29rLlxuICAgKiBDYWxsIGBkZXN0cm95KClgIHdoZW4geW91IGFyZSBkb25lLCBvciB1c2UgYGluamVjdENhcHRjaGFsYSgpYCB3aGljaCBkb2VzIGl0IGZvciB5b3UuXG4gICAqIE9uIHRoZSBzZXJ2ZXIgdGhlIGhhbmRsZSBzdGF5cyBpZGxlIGFuZCBgdmVyaWZ5KClgIHJlamVjdHMuXG4gICAqL1xuICBjcmVhdGUob3B0aW9uczogQ2FwdGNoYWxhSGFuZGxlT3B0aW9ucyk6IENhcHRjaGFsYUhhbmRsZSB7XG4gICAgY29uc3Qgem9uZSA9IHRoaXMuem9uZVxuICAgIGNvbnN0IHJlYWR5ID0gc2lnbmFsKGZhbHNlKVxuICAgIGNvbnN0IGxvYWRpbmcgPSBzaWduYWwodGhpcy5pc0Jyb3dzZXIpXG4gICAgY29uc3QgZXJyb3IgPSBzaWduYWw8RXJyb3IgfCBudWxsPihudWxsKVxuICAgIGxldCBpbnN0OiBDYXB0Y2hhbGFJbnN0YW5jZSB8IG51bGwgPSBudWxsXG4gICAgbGV0IGRlc3Ryb3llZCA9IGZhbHNlXG4gICAgbGV0IHBlbmRpbmc6IHsgcmVzb2x2ZTogKHI6IENhcHRjaGFsYVJlc3VsdCkgPT4gdm9pZDsgcmVqZWN0OiAoZTogRXJyb3IpID0+IHZvaWQgfSB8IG51bGwgPSBudWxsXG5cbiAgICBjb25zdCBzZXR0bGUgPSAoZm46IChwOiBOb25OdWxsYWJsZTx0eXBlb2YgcGVuZGluZz4pID0+IHZvaWQpID0+IHtcbiAgICAgIGNvbnN0IHAgPSBwZW5kaW5nXG4gICAgICBwZW5kaW5nID0gbnVsbFxuICAgICAgaWYgKHApIHpvbmUucnVuKCgpID0+IGZuKHApKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmlzQnJvd3Nlcikge1xuICAgICAgdGhpcy5sb2FkKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChkZXN0cm95ZWQpIHJldHVyblxuICAgICAgICAgIHpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IG9wdGlvbnMub25TZXJ2ZXJUb2tlbkV4cGlyZWRcbiAgICAgICAgICAgIGluc3QgPSAod2luZG93IGFzIGFueSkuQ2FwdGNoYWxhLmluaXQoe1xuICAgICAgICAgICAgICBhcHBLZXk6IG9wdGlvbnMuYXBwS2V5LFxuICAgICAgICAgICAgICBwcm9kdWN0OiBvcHRpb25zLnByb2R1Y3QgfHwgJ3BvcHVwJyxcbiAgICAgICAgICAgICAgYWN0aW9uOiBvcHRpb25zLmFjdGlvbiB8fCAnZGVmYXVsdCcsXG4gICAgICAgICAgICAgIGxhbmc6IG9wdGlvbnMubGFuZyxcbiAgICAgICAgICAgICAgdGhlbWU6IG9wdGlvbnMudGhlbWUsXG4gICAgICAgICAgICAgIHNlcnZlclRva2VuOiBvcHRpb25zLnNlcnZlclRva2VuLFxuICAgICAgICAgICAgICBvblNlcnZlclRva2VuRXhwaXJlZDogaGFuZGxlciA/ICgpID0+IGhhbmRsZXIoKSA/PyBudWxsIDogdW5kZWZpbmVkXG4gICAgICAgICAgICB9KSBhcyBDYXB0Y2hhbGFJbnN0YW5jZVxuICAgICAgICAgICAgaW5zdFxuICAgICAgICAgICAgICAub25SZWFkeSgoKSA9PlxuICAgICAgICAgICAgICAgIHpvbmUucnVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHJlYWR5LnNldCh0cnVlKVxuICAgICAgICAgICAgICAgICAgbG9hZGluZy5zZXQoZmFsc2UpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAub25TdWNjZXNzKChyZXN1bHQ6IENhcHRjaGFsYVJlc3VsdCkgPT4gc2V0dGxlKChwKSA9PiBwLnJlc29sdmUocmVzdWx0KSkpXG4gICAgICAgICAgICAgIC5vbkVycm9yKChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICBzZXR0bGUoKHApID0+IHAucmVqZWN0KG5vcm1hbGl6ZUVycm9yKGVycikpKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEZhaWxlZCBiZWZvcmUgaXQgYmVjYW1lIHJlYWR5IChmb3IgZXhhbXBsZSBhIGNvbmZpZ3VyYXRpb24gZXJyb3IpLlxuICAgICAgICAgICAgICAgICAgem9uZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlcnJvci5zZXQobm9ybWFsaXplRXJyb3IoZXJyKSlcbiAgICAgICAgICAgICAgICAgICAgbG9hZGluZy5zZXQoZmFsc2UpXG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG9uRXhwaXJlZCA9IG9wdGlvbnMub25FeHBpcmVkXG4gICAgICAgICAgICBpZiAob25FeHBpcmVkICYmIHR5cGVvZiBpbnN0Lm9uRXhwaXJlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBpbnN0Lm9uRXhwaXJlZCgoKSA9PiB6b25lLnJ1bigoKSA9PiBvbkV4cGlyZWQoKSkpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZGVzdHJveWVkKSByZXR1cm5cbiAgICAgICAgICB6b25lLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICBlcnJvci5zZXQobm9ybWFsaXplRXJyb3IoZXJyKSlcbiAgICAgICAgICAgIGxvYWRpbmcuc2V0KGZhbHNlKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlYWR5OiByZWFkeS5hc1JlYWRvbmx5KCksXG4gICAgICBsb2FkaW5nOiBsb2FkaW5nLmFzUmVhZG9ubHkoKSxcbiAgICAgIGVycm9yOiBlcnJvci5hc1JlYWRvbmx5KCksXG4gICAgICB2ZXJpZnk6ICgpID0+XG4gICAgICAgIG5ldyBQcm9taXNlPENhcHRjaGFsYVJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGlmICghaW5zdCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0NhcHRjaGEgbm90IGluaXRpYWxpemVkJykpXG4gICAgICAgICAgaWYgKHBlbmRpbmcpIHJldHVybiByZWplY3QobmV3IEVycm9yKCdWZXJpZmljYXRpb24gYWxyZWFkeSBpbiBwcm9ncmVzcycpKVxuICAgICAgICAgIHBlbmRpbmcgPSB7IHJlc29sdmUsIHJlamVjdCB9XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gaW5zdCEudmVyaWZ5KCkpXG4gICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICBwZW5kaW5nID0gbnVsbFxuICAgICAgICAgICAgcmVqZWN0KG5vcm1hbGl6ZUVycm9yKGUpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICByZXNldDogKCkgPT4gaW5zdD8ucmVzZXQoKSxcbiAgICAgIGJpbmRUbzogKHRhcmdldCkgPT4gaW5zdD8uYmluZFRvKHRhcmdldCksXG4gICAgICBhcHBlbmRUbzogKHRhcmdldCkgPT4gaW5zdD8uYXBwZW5kVG8odGFyZ2V0KSxcbiAgICAgIHNldExhbmc6IChsYW5nKSA9PiBpbnN0Py5zZXRMYW5nPy4obGFuZyksXG4gICAgICBkZXN0cm95OiAoKSA9PiB7XG4gICAgICAgIGRlc3Ryb3llZCA9IHRydWVcbiAgICAgICAgc2V0dGxlKChwKSA9PiBwLnJlamVjdChuZXcgRXJyb3IoJ0NhcHRjaGEgZGVzdHJveWVkJykpKVxuICAgICAgICBpZiAoaW5zdCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnN0LmRlc3Ryb3koKVxuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gYWxyZWFkeSBnb25lXG4gICAgICAgICAgfVxuICAgICAgICAgIGluc3QgPSBudWxsXG4gICAgICAgIH1cbiAgICAgICAgcmVhZHkuc2V0KGZhbHNlKVxuICAgICAgfSxcbiAgICAgIGluc3RhbmNlOiAoKSA9PiBpbnN0XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHdpZGdldCBib3VuZCB0byB0aGUgY3VycmVudCBjb21wb25lbnQgb3Igc2VydmljZTsgaXQgaXMgZGVzdHJveWVkXG4gKiB3aXRoIGl0LiBDYWxsIGluIGFuIGluamVjdGlvbiBjb250ZXh0IChjb25zdHJ1Y3RvciBvciBmaWVsZCBpbml0aWFsaXplcikuXG4gKlxuICogYGBgdHNcbiAqIGNhcHRjaGEgPSBpbmplY3RDYXB0Y2hhbGEoeyBhcHBLZXk6ICd5b3VyLWFwcC1rZXknLCBwcm9kdWN0OiAnYmluZCcsIGFjdGlvbjogJ2xvZ2luJyB9KVxuICogYXN5bmMgc3VibWl0KCkgeyBjb25zdCB7IHRva2VuIH0gPSBhd2FpdCB0aGlzLmNhcHRjaGEudmVyaWZ5KCkgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmplY3RDYXB0Y2hhbGEob3B0aW9uczogQ2FwdGNoYWxhSGFuZGxlT3B0aW9ucyk6IENhcHRjaGFsYUhhbmRsZSB7XG4gIGNvbnN0IGhhbmRsZSA9IGluamVjdChDYXB0Y2hhbGFTZXJ2aWNlKS5jcmVhdGUob3B0aW9ucylcbiAgaW5qZWN0KERlc3Ryb3lSZWYpLm9uRGVzdHJveSgoKSA9PiBoYW5kbGUuZGVzdHJveSgpKVxuICByZXR1cm4gaGFuZGxlXG59XG4iXX0=