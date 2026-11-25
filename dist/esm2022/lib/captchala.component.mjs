import { ChangeDetectionStrategy, Component, EventEmitter, Inject, Input, Output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { loadCaptchalaSDK } from './loader';
import * as i0 from "@angular/core";
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
 * The host element is the mount point. Nothing is rendered on the server; the SDK
 * is loaded from the CDN when the component first renders in the browser.
 */
export class CaptchalaComponent {
    constructor(host, zone, platformId) {
        this.host = host;
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
            const el = this.host.nativeElement;
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaComponent, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.2.12", type: CaptchalaComponent, isStandalone: true, selector: "captchala", inputs: { appKey: "appKey", product: "product", action: "action", lang: "lang", bindTo: "bindTo", serverToken: "serverToken", onServerTokenExpired: "onServerTokenExpired", theme: "theme" }, outputs: { success: "success", expired: "expired", error: "error", close: "close", ready: "ready" }, host: { properties: { "class.captchala-container--bind": "product === 'bind'" }, classAttribute: "captchala-container" }, usesOnChanges: true, ngImport: i0, template: '', isInline: true, styles: [":host{display:block;min-height:50px}\n", ":host(.captchala-container--bind){min-height:0;position:absolute;width:0;height:0;overflow:hidden}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: CaptchalaComponent, decorators: [{
            type: Component,
            args: [{ selector: 'captchala', standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        class: 'captchala-container',
                        '[class.captchala-container--bind]': "product === 'bind'"
                    }, styles: [":host{display:block;min-height:50px}\n", ":host(.captchala-container--bind){min-height:0;position:absolute;width:0;height:0;overflow:hidden}\n"] }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.NgZone }, { type: undefined, decorators: [{
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
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwdGNoYWxhLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvY2FwdGNoYWxhLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFFVCxZQUFZLEVBQ1osTUFBTSxFQUNOLEtBQUssRUFJTCxNQUFNLEVBQ04sV0FBVyxFQUVaLE1BQU0sZUFBZSxDQUFBO0FBQ3RCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFVBQVUsQ0FBQTs7QUFRM0MsNEZBQTRGO0FBQzVGLE1BQU0sYUFBYSxHQUFHLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUV2RixTQUFTLFlBQVksQ0FBQyxPQUEwQjtJQUM5QyxNQUFNLENBQUMsR0FBRyxPQUFjLENBQUE7SUFDeEIsT0FBTyxPQUFPLENBQUMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUN0RixDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBZUgsTUFBTSxPQUFPLGtCQUFrQjtJQTRDN0IsWUFDbUIsSUFBNkIsRUFDN0IsSUFBWSxFQUNSLFVBQWtCO1FBRnRCLFNBQUksR0FBSixJQUFJLENBQXlCO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVE7UUEzQy9CLG9CQUFvQjtRQUNYLFlBQU8sR0FBcUIsT0FBTyxDQUFBO1FBQzVDLHNDQUFzQztRQUM3QixXQUFNLEdBQUcsU0FBUyxDQUFBO1FBZ0IzQixnRUFBZ0U7UUFDN0MsWUFBTyxHQUFHLElBQUksWUFB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c291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbmplY3QsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFBMQVRGT1JNX0lELFxuICBTaW1wbGVDaGFuZ2VzXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnXG5pbXBvcnQgeyBpc1BsYXRmb3JtQnJvd3NlciB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbidcbmltcG9ydCB7IGxvYWRDYXB0Y2hhbGFTREsgfSBmcm9tICcuL2xvYWRlcidcbmltcG9ydCB0eXBlIHtcbiAgQ2FwdGNoYWxhSW5zdGFuY2UsXG4gIENhcHRjaGFsYVByb2R1Y3QsXG4gIENhcHRjaGFsYVJlc3VsdCxcbiAgQ2FwdGNoYWxhU2VydmVyVG9rZW5IYW5kbGVyXG59IGZyb20gJy4vdHlwZXMnXG5cbi8qKiBJbnB1dHMgdGhhdCByZWJ1aWxkIHRoZSB3aWRnZXQgd2hlbiB0aGV5IGNoYW5nZS4gYGxhbmdgIGlzIHN3aXRjaGVkIGluIHBsYWNlIGluc3RlYWQuICovXG5jb25zdCBSRUlOSVRfSU5QVVRTID0gWydhcHBLZXknLCAncHJvZHVjdCcsICdhY3Rpb24nLCAnYmluZFRvJywgJ3NlcnZlclRva2VuJywgJ3RoZW1lJ11cblxuZnVuY3Rpb24gaGFzTGlzdGVuZXJzKGVtaXR0ZXI6IEV2ZW50RW1pdHRlcjxhbnk+KTogYm9vbGVhbiB7XG4gIGNvbnN0IGUgPSBlbWl0dGVyIGFzIGFueVxuICByZXR1cm4gdHlwZW9mIGUub2JzZXJ2ZWQgPT09ICdib29sZWFuJyA/IGUub2JzZXJ2ZWQgOiAoZS5vYnNlcnZlcnM/Lmxlbmd0aCA/PyAwKSA+IDBcbn1cblxuLyoqXG4gKiBDYXB0Y2hhTGEgQ0FQVENIQSB3aWRnZXQuXG4gKlxuICogYGBgaHRtbFxuICogPGNhcHRjaGFsYSBhcHBLZXk9XCJ5b3VyLWFwcC1rZXlcIiAoc3VjY2Vzcyk9XCJvblN1Y2Nlc3MoJGV2ZW50KVwiIChlcnJvcik9XCJvbkVycm9yKCRldmVudClcIiAvPlxuICogYGBgXG4gKlxuICogVGhlIGhvc3QgZWxlbWVudCBpcyB0aGUgbW91bnQgcG9pbnQuIE5vdGhpbmcgaXMgcmVuZGVyZWQgb24gdGhlIHNlcnZlcjsgdGhlIFNES1xuICogaXMgbG9hZGVkIGZyb20gdGhlIENETiB3aGVuIHRoZSBjb21wb25lbnQgZmlyc3QgcmVuZGVycyBpbiB0aGUgYnJvd3Nlci5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnY2FwdGNoYWxhJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgdGVtcGxhdGU6ICcnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgaG9zdDoge1xuICAgIGNsYXNzOiAnY2FwdGNoYWxhLWNvbnRhaW5lcicsXG4gICAgJ1tjbGFzcy5jYXB0Y2hhbGEtY29udGFpbmVyLS1iaW5kXSc6IFwicHJvZHVjdCA9PT0gJ2JpbmQnXCJcbiAgfSxcbiAgc3R5bGVzOiBbXG4gICAgJzpob3N0e2Rpc3BsYXk6YmxvY2s7bWluLWhlaWdodDo1MHB4fScsXG4gICAgJzpob3N0KC5jYXB0Y2hhbGEtY29udGFpbmVyLS1iaW5kKXttaW4taGVpZ2h0OjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MDtoZWlnaHQ6MDtvdmVyZmxvdzpoaWRkZW59J1xuICBdXG59KVxuZXhwb3J0IGNsYXNzIENhcHRjaGFsYUNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLyoqIFlvdXIgcHVibGljIENhcHRjaGFMYSBhcHAga2V5LiAqL1xuICBASW5wdXQoeyByZXF1aXJlZDogdHJ1ZSB9KSBhcHBLZXkhOiBzdHJpbmdcbiAgLyoqIERpc3BsYXkgbW9kZS4gKi9cbiAgQElucHV0KCkgcHJvZHVjdDogQ2FwdGNoYWxhUHJvZHVjdCA9ICdwb3B1cCdcbiAgLyoqIEJ1c2luZXNzIHNjZW5lLCBlLmcuIGAnbG9naW4nYC4gKi9cbiAgQElucHV0KCkgYWN0aW9uID0gJ2RlZmF1bHQnXG4gIC8qKiBMYW5ndWFnZSBjb2RlLiBVbnNldCA9IHRoZSBicm93c2VyIGxhbmd1YWdlLiBDaGFuZ2luZyBpdCBzd2l0Y2hlcyBsYW5ndWFnZSBpbiBwbGFjZS4gKi9cbiAgQElucHV0KCkgbGFuZz86IHN0cmluZ1xuICAvKiogRWxlbWVudCBvciBzZWxlY3RvciB0byBiaW5kIHRvIChvbmx5IGZvciBgcHJvZHVjdD1cImJpbmRcImApLiAqL1xuICBASW5wdXQoKSBiaW5kVG8/OiBzdHJpbmcgfCBIVE1MRWxlbWVudFxuICAvKipcbiAgICogT25lLXRpbWUgc2VydmVyX3Rva2VuIGlzc3VlZCBieSB5b3VyIGJhY2tlbmQgdmlhIFBPU1QgL3YxL3NlcnZlci9jaGFsbGVuZ2UvaXNzdWVcbiAgICogKHdpdGggWC1BcHAtS2V5ICsgWC1BcHAtU2VjcmV0KS4gTWFuZGF0b3J5IHdoZW4gdGhlIGFwcCBoYXNcbiAgICogYHNlcnZlcl90b2tlbl9yZXF1aXJlZD10cnVlYC5cbiAgICovXG4gIEBJbnB1dCgpIHNlcnZlclRva2VuPzogc3RyaW5nXG4gIC8qKiBDYWxsZWQgd2hlbiBgc2VydmVyVG9rZW5gIGlzIHJlamVjdGVkOyByZXR1cm4gYSBuZXcgdG9rZW4gdG8gcmV0cnkgb25jZSwgb3IgbnVsbC4gKi9cbiAgQElucHV0KCkgb25TZXJ2ZXJUb2tlbkV4cGlyZWQ/OiBDYXB0Y2hhbGFTZXJ2ZXJUb2tlbkhhbmRsZXJcbiAgLyoqIFRoZW1lOiBwcmVzZXQgc3RyaW5nIG9yIGB7IGN1c3RvbTogeyBicmlnaHRuZXNzOiAnbGlnaHQnIHwgJ2RhcmsnIHwgJ3N5c3RlbScsIC4uLiB9IH1gLiAqL1xuICBASW5wdXQoKSB0aGVtZT86IGFueVxuXG4gIC8qKiBWZXJpZmljYXRpb24gcGFzc2VkLiBTZW5kIGAkZXZlbnQudG9rZW5gIHRvIHlvdXIgYmFja2VuZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHN1Y2Nlc3MgPSBuZXcgRXZlbnRFbWl0dGVyPENhcHRjaGFsYVJlc3VsdD4oKVxuICAvKipcbiAgICogVGhlIHBhc3MgdG9rZW4gb2YgdGhlIGxhc3Qgc3VjY2VzcyBleHBpcmVkIGJlZm9yZSBpdCB3YXMgdXNlZC4gRmlyZXMgb25jZSxcbiAgICogaW5zdGVhZCBvZiBgZXJyb3JgLCBvbmx5IHdoZW4geW91IGxpc3RlbiB0byBpdC4gVGhlIHdpZGdldCBzaG93cyB0aGUgZXhwaXJ5XG4gICAqIGVpdGhlciB3YXk7IGNhbGwgYHJlc2V0KClgIHRoZW4gYHZlcmlmeSgpYCBmb3IgYSBuZXcgdmVyaWZpY2F0aW9uLlxuICAgKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGV4cGlyZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KClcbiAgLyoqIExvYWRpbmcgb3IgdmVyaWZpY2F0aW9uIGZhaWxlZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGVycm9yID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KClcbiAgLyoqIFRoZSBjaGFsbGVuZ2UgcGFuZWwgd2FzIGNsb3NlZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGNsb3NlID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpXG4gIC8qKiBUaGUgd2lkZ2V0IGlzIHJlYWR5LiAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgcmVhZHkgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KClcblxuICBwcml2YXRlIGluc3RhbmNlOiBDYXB0Y2hhbGFJbnN0YW5jZSB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgdmlld1JlYWR5ID0gZmFsc2VcbiAgcHJpdmF0ZSBkZXN0cm95ZWQgPSBmYWxzZVxuICBwcml2YXRlIGluaXRTZXEgPSAwXG4gIHByaXZhdGUgcmVpbml0VGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSByZWFkb25seSBpc0Jyb3dzZXI6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgem9uZTogTmdab25lLFxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IG9iamVjdFxuICApIHtcbiAgICB0aGlzLmlzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpXG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgdGhpcy52aWV3UmVhZHkgPSB0cnVlXG4gICAgaWYgKHRoaXMuaXNCcm93c2VyKSB0aGlzLmluaXQoKVxuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGlmICghdGhpcy52aWV3UmVhZHkgfHwgIXRoaXMuaXNCcm93c2VyKSByZXR1cm5cbiAgICBpZiAoUkVJTklUX0lOUFVUUy5zb21lKChrKSA9PiBjaGFuZ2VzW2tdICYmICFjaGFuZ2VzW2tdLmZpcnN0Q2hhbmdlKSkge1xuICAgICAgaWYgKHRoaXMucmVpbml0VGltZXIpIGNsZWFyVGltZW91dCh0aGlzLnJlaW5pdFRpbWVyKVxuICAgICAgdGhpcy5yZWluaXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnJlaW5pdFRpbWVyID0gbnVsbFxuICAgICAgICB0aGlzLmluaXQoKVxuICAgICAgfSwgMTAwKVxuICAgIH0gZWxzZSBpZiAoY2hhbmdlc1snbGFuZyddICYmICFjaGFuZ2VzWydsYW5nJ10uZmlyc3RDaGFuZ2UgJiYgdGhpcy5sYW5nKSB7XG4gICAgICB0aGlzLmluc3RhbmNlPy5zZXRMYW5nPy4odGhpcy5sYW5nKVxuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZVxuICAgIGlmICh0aGlzLnJlaW5pdFRpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5yZWluaXRUaW1lcilcbiAgICB0aGlzLnRlYXJkb3duKClcbiAgfVxuXG4gIC8qKiBPcGVucyB0aGUgY2hhbGxlbmdlIChwb3B1cCAvIGJpbmQgbW9kZXMpLiAqL1xuICB2ZXJpZnkoKTogdm9pZCB7XG4gICAgdGhpcy5pbnN0YW5jZT8udmVyaWZ5KClcbiAgfVxuXG4gIC8qKiBSZXNldHMgdGhlIHdpZGdldCBzdGF0ZS4gKi9cbiAgcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy5pbnN0YW5jZT8ucmVzZXQoKVxuICB9XG5cbiAgLyoqIERlc3Ryb3lzIHRoZSBTREsgaW5zdGFuY2UuIFRoZSBjb21wb25lbnQgcmUtY3JlYXRlcyBpdCB3aGVuIGEga2V5IGlucHV0IGNoYW5nZXMuICovXG4gIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy50ZWFyZG93bigpXG4gIH1cblxuICAvKiogQmluZHMgdGhlIGNoYWxsZW5nZSB0byBhbiBlbGVtZW50IChiaW5kIG1vZGUpLiAqL1xuICBiaW5kKHRhcmdldDogc3RyaW5nIHwgSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlPy5iaW5kVG8odGFyZ2V0KVxuICB9XG5cbiAgLyoqIFN3aXRjaGVzIHRoZSBsYW5ndWFnZSBpbiBwbGFjZS4gKi9cbiAgc2V0TGFuZyhsYW5nOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlPy5zZXRMYW5nPy4obGFuZylcbiAgfVxuXG4gIC8qKiBUaGUgcmF3IFNESyBpbnN0YW5jZSwgb3IgbnVsbCBiZWZvcmUgaXQgaXMgcmVhZHkuICovXG4gIGdldEluc3RhbmNlKCk6IENhcHRjaGFsYUluc3RhbmNlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VcbiAgfVxuXG4gIHByaXZhdGUgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIGNvbnN0IGluc3QgPSB0aGlzLmluc3RhbmNlXG4gICAgICB0aGlzLmluc3RhbmNlID0gbnVsbFxuICAgICAgdHJ5IHtcbiAgICAgICAgaW5zdC5kZXN0cm95KClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBhbHJlYWR5IGdvbmVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVtaXQ8VD4oZW1pdHRlcjogRXZlbnRFbWl0dGVyPFQ+LCB2YWx1ZT86IFQpOiB2b2lkIHtcbiAgICB0aGlzLnpvbmUucnVuKCgpID0+IGVtaXR0ZXIuZW1pdCh2YWx1ZSBhcyBUKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzZXEgPSArK3RoaXMuaW5pdFNlcVxuICAgIHRyeSB7XG4gICAgICAvLyBMb2FkIGFuZCBydW4gdGhlIFNESyBvdXRzaWRlIEFuZ3VsYXIgc28gaXRzIHRpbWVycyBhbmQgYW5pbWF0aW9uc1xuICAgICAgLy8gZG8gbm90IHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbjsgZXZlbnRzIHJlLWVudGVyIHRoZSB6b25lLlxuICAgICAgYXdhaXQgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IGxvYWRDYXB0Y2hhbGFTREsoKSlcbiAgICAgIGlmICh0aGlzLmRlc3Ryb3llZCB8fCBzZXEgIT09IHRoaXMuaW5pdFNlcSkgcmV0dXJuXG4gICAgICBjb25zdCBDYXB0Y2hhbGEgPSAod2luZG93IGFzIGFueSkuQ2FwdGNoYWxhXG4gICAgICBjb25zdCBlbCA9IHRoaXMuaG9zdC5uYXRpdmVFbGVtZW50XG4gICAgICBpZiAoIUNhcHRjaGFsYSB8fCAhZWwpIHJldHVyblxuXG4gICAgICB0aGlzLnpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICB0aGlzLnRlYXJkb3duKClcbiAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpXG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMub25TZXJ2ZXJUb2tlbkV4cGlyZWRcbiAgICAgICAgY29uc3QgaW5zdDogQ2FwdGNoYWxhSW5zdGFuY2UgPSBDYXB0Y2hhbGEuaW5pdCh7XG4gICAgICAgICAgYXBwS2V5OiB0aGlzLmFwcEtleSxcbiAgICAgICAgICBwcm9kdWN0OiB0aGlzLnByb2R1Y3QsXG4gICAgICAgICAgYWN0aW9uOiB0aGlzLmFjdGlvbixcbiAgICAgICAgICBsYW5nOiB0aGlzLmxhbmcsXG4gICAgICAgICAgdGhlbWU6IHRoaXMudGhlbWUsXG4gICAgICAgICAgc2VydmVyVG9rZW46IHRoaXMuc2VydmVyVG9rZW4sXG4gICAgICAgICAgb25TZXJ2ZXJUb2tlbkV4cGlyZWQ6IGhhbmRsZXIgPyAoKSA9PiBoYW5kbGVyKCkgPz8gbnVsbCA6IHVuZGVmaW5lZFxuICAgICAgICB9KVxuXG4gICAgICAgIGluc3RcbiAgICAgICAgICAub25SZWFkeSgoKSA9PiB0aGlzLmVtaXQodGhpcy5yZWFkeSkpXG4gICAgICAgICAgLm9uU3VjY2VzcygocmVzdWx0OiBDYXB0Y2hhbGFSZXN1bHQpID0+IHRoaXMuZW1pdCh0aGlzLnN1Y2Nlc3MsIHJlc3VsdCkpXG4gICAgICAgICAgLm9uRXJyb3IoKGVycjogYW55KSA9PiB0aGlzLmVtaXQodGhpcy5lcnJvciwgZXJyKSlcbiAgICAgICAgICAub25DbG9zZSgoKSA9PiB0aGlzLmVtaXQodGhpcy5jbG9zZSkpXG4gICAgICAgIC8vIFJlZ2lzdGVyZWQgb25seSB3aXRoIGEgbGlzdGVuZXI6IHdpdGhvdXQgb25lIHRoZSBTREsgcmVwb3J0cyBleHBpcnkgdmlhIG9uRXJyb3IuXG4gICAgICAgIGlmIChoYXNMaXN0ZW5lcnModGhpcy5leHBpcmVkKSAmJiB0eXBlb2YgaW5zdC5vbkV4cGlyZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBpbnN0Lm9uRXhwaXJlZCgoKSA9PiB0aGlzLmVtaXQodGhpcy5leHBpcmVkKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnByb2R1Y3QgPT09ICdiaW5kJykge1xuICAgICAgICAgIGlmICh0aGlzLmJpbmRUbykgaW5zdC5iaW5kVG8odGhpcy5iaW5kVG8pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW5zdC5hcHBlbmRUbyhlbClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdFxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICghdGhpcy5kZXN0cm95ZWQpIHRoaXMuZW1pdCh0aGlzLmVycm9yLCBlcnIpXG4gICAgfVxuICB9XG59XG4iXX0=