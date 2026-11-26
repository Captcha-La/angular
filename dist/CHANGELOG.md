# Changelog

## 1.0.1

- README in Japanese, Korean, Spanish, Portuguese (BR) and German, with a language switcher in every README. No code changes.

## 1.0.0

- Initial release.
- `CaptchalaComponent` (`<captchala>`): standalone component with the inputs `appKey`,
  `product`, `action`, `lang`, `theme`, `bindTo`, `serverToken`, `onServerTokenExpired`
  and the outputs `success`, `error`, `close`, `ready`, `expired`. Methods `verify()`,
  `reset()`, `destroy()`, `bind()`, `setLang()`, `getInstance()`.
- `expired` output: called once when the pass token of the last success expires before it
  was used; with a listener, instead of `error`. Without one, `error` fires once.
- `injectCaptchala()` and `CaptchalaService.create()`: a widget without a template (bind mode
  on your own button), with `ready` / `loading` / `error` signals and a promise-based `verify()`.
- Changing `lang` switches the language in place; other key inputs rebuild the widget.
- SSR safe: nothing is loaded on the server. The SDK runs outside the Angular zone; events
  re-enter it. Works with zoneless apps.
- Supports Angular 16 and later (built with the Angular 16 compiler in partial mode).
