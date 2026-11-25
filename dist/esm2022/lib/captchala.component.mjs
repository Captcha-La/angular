import { ChangeDetectionStrategy, Component, EventEmitter, Inject, Input, Output, PLATFORM_ID, ViewChild } from '@angular/core';
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
 * Nothing but an empty container is rendered on the server; the SDK
 * is loaded from the CDN when the component first renders in the browser.
 */
export class CaptchalaComponent {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwdGNoYWxhLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvY2FwdGNoYWxhLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFFVCxZQUFZLEVBQ1osTUFBTSxFQUNOLEtBQUssRUFJTCxNQUFNLEVBQ04sV0FBVyxFQUVYLFNBQVMsRUFDVixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxVQUFVLENBQUE7O0FBUTNDLDRGQUE0RjtBQUM1RixNQUFNLGFBQWEsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFFdkYsU0FBUyxZQUFZLENBQUMsT0FBMEI7SUFDOUMsTUFBTSxDQUFDLEdBQUcsT0FBYyxDQUFBO0lBQ3hCLE9BQU8sT0FBTyxDQUFDLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDdEYsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQWlCSCxNQUFNLE9BQU8sa0JBQWtCO0lBOEM3QixZQUNtQixJQUFZLEVBQ1IsVUFBa0I7UUFEdEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQTVDL0Isb0JBQW9CO1FBQ1gsWUFBTyxHQUFxQixPQUFPLENBQUE7UUFDNUMsc0NBQXNDO1FBQzdCLFdBQU0sR0FBRyxTQUFTLENBQUE7UUFnQjNCLGdFQUFnRTtRQUM3QyxZQUFPLEdBQUcsSUFBSSxZQUFZLEVBQW1CLENBQUE7UUFDaEU7Ozs7V0FJRztR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Uzt1QkFBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbmplY3QsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFBMQVRGT1JNX0lELFxuICBTaW1wbGVDaGFuZ2VzLFxuICBWaWV3Q2hpbGRcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSdcbmltcG9ydCB7IGlzUGxhdGZvcm1Ccm93c2VyIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJ1xuaW1wb3J0IHsgbG9hZENhcHRjaGFsYVNESyB9IGZyb20gJy4vbG9hZGVyJ1xuaW1wb3J0IHR5cGUge1xuICBDYXB0Y2hhbGFJbnN0YW5jZSxcbiAgQ2FwdGNoYWxhUHJvZHVjdCxcbiAgQ2FwdGNoYWxhUmVzdWx0LFxuICBDYXB0Y2hhbGFTZXJ2ZXJUb2tlbkhhbmRsZXJcbn0gZnJvbSAnLi90eXBlcydcblxuLyoqIElucHV0cyB0aGF0IHJlYnVpbGQgdGhlIHdpZGdldCB3aGVuIHRoZXkgY2hhbmdlLiBgbGFuZ2AgaXMgc3dpdGNoZWQgaW4gcGxhY2UgaW5zdGVhZC4gKi9cbmNvbnN0IFJFSU5JVF9JTlBVVFMgPSBbJ2FwcEtleScsICdwcm9kdWN0JywgJ2FjdGlvbicsICdiaW5kVG8nLCAnc2VydmVyVG9rZW4nLCAndGhlbWUnXVxuXG5mdW5jdGlvbiBoYXNMaXN0ZW5lcnMoZW1pdHRlcjogRXZlbnRFbWl0dGVyPGFueT4pOiBib29sZWFuIHtcbiAgY29uc3QgZSA9IGVtaXR0ZXIgYXMgYW55XG4gIHJldHVybiB0eXBlb2YgZS5vYnNlcnZlZCA9PT0gJ2Jvb2xlYW4nID8gZS5vYnNlcnZlZCA6IChlLm9ic2VydmVycz8ubGVuZ3RoID8/IDApID4gMFxufVxuXG4vKipcbiAqIENhcHRjaGFMYSBDQVBUQ0hBIHdpZGdldC5cbiAqXG4gKiBgYGBodG1sXG4gKiA8Y2FwdGNoYWxhIGFwcEtleT1cInlvdXItYXBwLWtleVwiIChzdWNjZXNzKT1cIm9uU3VjY2VzcygkZXZlbnQpXCIgKGVycm9yKT1cIm9uRXJyb3IoJGV2ZW50KVwiIC8+XG4gKiBgYGBcbiAqXG4gKiBOb3RoaW5nIGJ1dCBhbiBlbXB0eSBjb250YWluZXIgaXMgcmVuZGVyZWQgb24gdGhlIHNlcnZlcjsgdGhlIFNES1xuICogaXMgbG9hZGVkIGZyb20gdGhlIENETiB3aGVuIHRoZSBjb21wb25lbnQgZmlyc3QgcmVuZGVycyBpbiB0aGUgYnJvd3Nlci5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnY2FwdGNoYWxhJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgLy8gVGhlIFNESyBtb3VudHMgaW50byBhIHBsYWluIDxkaXY+IHNvIGl0IGNhbiByZW5kZXIgaW4gaXRzIG93biBzaGFkb3cgcm9vdC5cbiAgdGVtcGxhdGU6ICc8ZGl2ICNtb3VudCBjbGFzcz1cImNhcHRjaGFsYS1tb3VudFwiPjwvZGl2PicsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBob3N0OiB7XG4gICAgY2xhc3M6ICdjYXB0Y2hhbGEtY29udGFpbmVyJyxcbiAgICAnW2NsYXNzLmNhcHRjaGFsYS1jb250YWluZXItLWJpbmRdJzogXCJwcm9kdWN0ID09PSAnYmluZCdcIlxuICB9LFxuICBzdHlsZXM6IFtcbiAgICAnOmhvc3R7ZGlzcGxheTpibG9jazttaW4taGVpZ2h0OjUwcHh9JyxcbiAgICAnLmNhcHRjaGFsYS1tb3VudHt3aWR0aDoxMDAlfScsXG4gICAgJzpob3N0KC5jYXB0Y2hhbGEtY29udGFpbmVyLS1iaW5kKXttaW4taGVpZ2h0OjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MDtoZWlnaHQ6MDtvdmVyZmxvdzpoaWRkZW59J1xuICBdXG59KVxuZXhwb3J0IGNsYXNzIENhcHRjaGFsYUNvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLyoqIFlvdXIgcHVibGljIENhcHRjaGFMYSBhcHAga2V5LiAqL1xuICBASW5wdXQoeyByZXF1aXJlZDogdHJ1ZSB9KSBhcHBLZXkhOiBzdHJpbmdcbiAgLyoqIERpc3BsYXkgbW9kZS4gKi9cbiAgQElucHV0KCkgcHJvZHVjdDogQ2FwdGNoYWxhUHJvZHVjdCA9ICdwb3B1cCdcbiAgLyoqIEJ1c2luZXNzIHNjZW5lLCBlLmcuIGAnbG9naW4nYC4gKi9cbiAgQElucHV0KCkgYWN0aW9uID0gJ2RlZmF1bHQnXG4gIC8qKiBMYW5ndWFnZSBjb2RlLiBVbnNldCA9IHRoZSBicm93c2VyIGxhbmd1YWdlLiBDaGFuZ2luZyBpdCBzd2l0Y2hlcyBsYW5ndWFnZSBpbiBwbGFjZS4gKi9cbiAgQElucHV0KCkgbGFuZz86IHN0cmluZ1xuICAvKiogRWxlbWVudCBvciBzZWxlY3RvciB0byBiaW5kIHRvIChvbmx5IGZvciBgcHJvZHVjdD1cImJpbmRcImApLiAqL1xuICBASW5wdXQoKSBiaW5kVG8/OiBzdHJpbmcgfCBIVE1MRWxlbWVudFxuICAvKipcbiAgICogT25lLXRpbWUgc2VydmVyX3Rva2VuIGlzc3VlZCBieSB5b3VyIGJhY2tlbmQgdmlhIFBPU1QgL3YxL3NlcnZlci9jaGFsbGVuZ2UvaXNzdWVcbiAgICogKHdpdGggWC1BcHAtS2V5ICsgWC1BcHAtU2VjcmV0KS4gTWFuZGF0b3J5IHdoZW4gdGhlIGFwcCBoYXNcbiAgICogYHNlcnZlcl90b2tlbl9yZXF1aXJlZD10cnVlYC5cbiAgICovXG4gIEBJbnB1dCgpIHNlcnZlclRva2VuPzogc3RyaW5nXG4gIC8qKiBDYWxsZWQgd2hlbiBgc2VydmVyVG9rZW5gIGlzIHJlamVjdGVkOyByZXR1cm4gYSBuZXcgdG9rZW4gdG8gcmV0cnkgb25jZSwgb3IgbnVsbC4gKi9cbiAgQElucHV0KCkgb25TZXJ2ZXJUb2tlbkV4cGlyZWQ/OiBDYXB0Y2hhbGFTZXJ2ZXJUb2tlbkhhbmRsZXJcbiAgLyoqIFRoZW1lOiBwcmVzZXQgc3RyaW5nIG9yIGB7IGN1c3RvbTogeyBicmlnaHRuZXNzOiAnbGlnaHQnIHwgJ2RhcmsnIHwgJ3N5c3RlbScsIC4uLiB9IH1gLiAqL1xuICBASW5wdXQoKSB0aGVtZT86IGFueVxuXG4gIC8qKiBWZXJpZmljYXRpb24gcGFzc2VkLiBTZW5kIGAkZXZlbnQudG9rZW5gIHRvIHlvdXIgYmFja2VuZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHN1Y2Nlc3MgPSBuZXcgRXZlbnRFbWl0dGVyPENhcHRjaGFsYVJlc3VsdD4oKVxuICAvKipcbiAgICogVGhlIHBhc3MgdG9rZW4gb2YgdGhlIGxhc3Qgc3VjY2VzcyBleHBpcmVkIGJlZm9yZSBpdCB3YXMgdXNlZC4gRmlyZXMgb25jZSxcbiAgICogaW5zdGVhZCBvZiBgZXJyb3JgLCBvbmx5IHdoZW4geW91IGxpc3RlbiB0byBpdC4gVGhlIHdpZGdldCBzaG93cyB0aGUgZXhwaXJ5XG4gICAqIGVpdGhlciB3YXk7IGNhbGwgYHJlc2V0KClgIHRoZW4gYHZlcmlmeSgpYCBmb3IgYSBuZXcgdmVyaWZpY2F0aW9uLlxuICAgKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGV4cGlyZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KClcbiAgLyoqIExvYWRpbmcgb3IgdmVyaWZpY2F0aW9uIGZhaWxlZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGVycm9yID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KClcbiAgLyoqIFRoZSBjaGFsbGVuZ2UgcGFuZWwgd2FzIGNsb3NlZC4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGNsb3NlID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpXG4gIC8qKiBUaGUgd2lkZ2V0IGlzIHJlYWR5LiAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgcmVhZHkgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KClcblxuICBAVmlld0NoaWxkKCdtb3VudCcsIHsgc3RhdGljOiB0cnVlIH0pIHByaXZhdGUgbW91bnQhOiBFbGVtZW50UmVmPEhUTUxEaXZFbGVtZW50PlxuXG4gIHByaXZhdGUgaW5zdGFuY2U6IENhcHRjaGFsYUluc3RhbmNlIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSB2aWV3UmVhZHkgPSBmYWxzZVxuICBwcml2YXRlIGRlc3Ryb3llZCA9IGZhbHNlXG4gIHByaXZhdGUgaW5pdFNlcSA9IDBcbiAgcHJpdmF0ZSByZWluaXRUaW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbFxuICBwcml2YXRlIHJlYWRvbmx5IGlzQnJvd3NlcjogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgem9uZTogTmdab25lLFxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IG9iamVjdFxuICApIHtcbiAgICB0aGlzLmlzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpXG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgdGhpcy52aWV3UmVhZHkgPSB0cnVlXG4gICAgaWYgKHRoaXMuaXNCcm93c2VyKSB0aGlzLmluaXQoKVxuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGlmICghdGhpcy52aWV3UmVhZHkgfHwgIXRoaXMuaXNCcm93c2VyKSByZXR1cm5cbiAgICBpZiAoUkVJTklUX0lOUFVUUy5zb21lKChrKSA9PiBjaGFuZ2VzW2tdICYmICFjaGFuZ2VzW2tdLmZpcnN0Q2hhbmdlKSkge1xuICAgICAgaWYgKHRoaXMucmVpbml0VGltZXIpIGNsZWFyVGltZW91dCh0aGlzLnJlaW5pdFRpbWVyKVxuICAgICAgdGhpcy5yZWluaXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnJlaW5pdFRpbWVyID0gbnVsbFxuICAgICAgICB0aGlzLmluaXQoKVxuICAgICAgfSwgMTAwKVxuICAgIH0gZWxzZSBpZiAoY2hhbmdlc1snbGFuZyddICYmICFjaGFuZ2VzWydsYW5nJ10uZmlyc3RDaGFuZ2UgJiYgdGhpcy5sYW5nKSB7XG4gICAgICB0aGlzLmluc3RhbmNlPy5zZXRMYW5nPy4odGhpcy5sYW5nKVxuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZVxuICAgIGlmICh0aGlzLnJlaW5pdFRpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5yZWluaXRUaW1lcilcbiAgICB0aGlzLnRlYXJkb3duKClcbiAgfVxuXG4gIC8qKiBPcGVucyB0aGUgY2hhbGxlbmdlIChwb3B1cCAvIGJpbmQgbW9kZXMpLiAqL1xuICB2ZXJpZnkoKTogdm9pZCB7XG4gICAgdGhpcy5pbnN0YW5jZT8udmVyaWZ5KClcbiAgfVxuXG4gIC8qKiBSZXNldHMgdGhlIHdpZGdldCBzdGF0ZS4gKi9cbiAgcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy5pbnN0YW5jZT8ucmVzZXQoKVxuICB9XG5cbiAgLyoqIERlc3Ryb3lzIHRoZSBTREsgaW5zdGFuY2UuIFRoZSBjb21wb25lbnQgcmUtY3JlYXRlcyBpdCB3aGVuIGEga2V5IGlucHV0IGNoYW5nZXMuICovXG4gIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy50ZWFyZG93bigpXG4gIH1cblxuICAvKiogQmluZHMgdGhlIGNoYWxsZW5nZSB0byBhbiBlbGVtZW50IChiaW5kIG1vZGUpLiAqL1xuICBiaW5kKHRhcmdldDogc3RyaW5nIHwgSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlPy5iaW5kVG8odGFyZ2V0KVxuICB9XG5cbiAgLyoqIFN3aXRjaGVzIHRoZSBsYW5ndWFnZSBpbiBwbGFjZS4gKi9cbiAgc2V0TGFuZyhsYW5nOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmluc3RhbmNlPy5zZXRMYW5nPy4obGFuZylcbiAgfVxuXG4gIC8qKiBUaGUgcmF3IFNESyBpbnN0YW5jZSwgb3IgbnVsbCBiZWZvcmUgaXQgaXMgcmVhZHkuICovXG4gIGdldEluc3RhbmNlKCk6IENhcHRjaGFsYUluc3RhbmNlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VcbiAgfVxuXG4gIHByaXZhdGUgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaW5zdGFuY2UpIHtcbiAgICAgIGNvbnN0IGluc3QgPSB0aGlzLmluc3RhbmNlXG4gICAgICB0aGlzLmluc3RhbmNlID0gbnVsbFxuICAgICAgdHJ5IHtcbiAgICAgICAgaW5zdC5kZXN0cm95KClcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBhbHJlYWR5IGdvbmVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVtaXQ8VD4oZW1pdHRlcjogRXZlbnRFbWl0dGVyPFQ+LCB2YWx1ZT86IFQpOiB2b2lkIHtcbiAgICB0aGlzLnpvbmUucnVuKCgpID0+IGVtaXR0ZXIuZW1pdCh2YWx1ZSBhcyBUKSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzZXEgPSArK3RoaXMuaW5pdFNlcVxuICAgIHRyeSB7XG4gICAgICAvLyBMb2FkIGFuZCBydW4gdGhlIFNESyBvdXRzaWRlIEFuZ3VsYXIgc28gaXRzIHRpbWVycyBhbmQgYW5pbWF0aW9uc1xuICAgICAgLy8gZG8gbm90IHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbjsgZXZlbnRzIHJlLWVudGVyIHRoZSB6b25lLlxuICAgICAgYXdhaXQgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IGxvYWRDYXB0Y2hhbGFTREsoKSlcbiAgICAgIGlmICh0aGlzLmRlc3Ryb3llZCB8fCBzZXEgIT09IHRoaXMuaW5pdFNlcSkgcmV0dXJuXG4gICAgICBjb25zdCBDYXB0Y2hhbGEgPSAod2luZG93IGFzIGFueSkuQ2FwdGNoYWxhXG4gICAgICBjb25zdCBlbCA9IHRoaXMubW91bnQ/Lm5hdGl2ZUVsZW1lbnRcbiAgICAgIGlmICghQ2FwdGNoYWxhIHx8ICFlbCkgcmV0dXJuXG5cbiAgICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAgIHRoaXMudGVhcmRvd24oKVxuICAgICAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZClcblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5vblNlcnZlclRva2VuRXhwaXJlZFxuICAgICAgICBjb25zdCBpbnN0OiBDYXB0Y2hhbGFJbnN0YW5jZSA9IENhcHRjaGFsYS5pbml0KHtcbiAgICAgICAgICBhcHBLZXk6IHRoaXMuYXBwS2V5LFxuICAgICAgICAgIHByb2R1Y3Q6IHRoaXMucHJvZHVjdCxcbiAgICAgICAgICBhY3Rpb246IHRoaXMuYWN0aW9uLFxuICAgICAgICAgIGxhbmc6IHRoaXMubGFuZyxcbiAgICAgICAgICB0aGVtZTogdGhpcy50aGVtZSxcbiAgICAgICAgICBzZXJ2ZXJUb2tlbjogdGhpcy5zZXJ2ZXJUb2tlbixcbiAgICAgICAgICBvblNlcnZlclRva2VuRXhwaXJlZDogaGFuZGxlciA/ICgpID0+IGhhbmRsZXIoKSA/PyBudWxsIDogdW5kZWZpbmVkXG4gICAgICAgIH0pXG5cbiAgICAgICAgaW5zdFxuICAgICAgICAgIC5vblJlYWR5KCgpID0+IHRoaXMuZW1pdCh0aGlzLnJlYWR5KSlcbiAgICAgICAgICAub25TdWNjZXNzKChyZXN1bHQ6IENhcHRjaGFsYVJlc3VsdCkgPT4gdGhpcy5lbWl0KHRoaXMuc3VjY2VzcywgcmVzdWx0KSlcbiAgICAgICAgICAub25FcnJvcigoZXJyOiBhbnkpID0+IHRoaXMuZW1pdCh0aGlzLmVycm9yLCBlcnIpKVxuICAgICAgICAgIC5vbkNsb3NlKCgpID0+IHRoaXMuZW1pdCh0aGlzLmNsb3NlKSlcbiAgICAgICAgLy8gUmVnaXN0ZXJlZCBvbmx5IHdpdGggYSBsaXN0ZW5lcjogd2l0aG91dCBvbmUgdGhlIFNESyByZXBvcnRzIGV4cGlyeSB2aWEgb25FcnJvci5cbiAgICAgICAgaWYgKGhhc0xpc3RlbmVycyh0aGlzLmV4cGlyZWQpICYmIHR5cGVvZiBpbnN0Lm9uRXhwaXJlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGluc3Qub25FeHBpcmVkKCgpID0+IHRoaXMuZW1pdCh0aGlzLmV4cGlyZWQpKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucHJvZHVjdCA9PT0gJ2JpbmQnKSB7XG4gICAgICAgICAgaWYgKHRoaXMuYmluZFRvKSBpbnN0LmJpbmRUbyh0aGlzLmJpbmRUbylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbnN0LmFwcGVuZFRvKGVsKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0XG4gICAgICB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmRlc3Ryb3llZCkgdGhpcy5lbWl0KHRoaXMuZXJyb3IsIGVycilcbiAgICB9XG4gIH1cbn1cbiJdfQ==