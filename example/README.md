# @captcha-la/angular example

Two routes: `/` mounts the component (float mode) and an `injectCaptchala()` handle
(bind mode); `/other` has no CAPTCHA, so switching routes destroys and re-creates the widget.

```bash
# in the repository root
npm install && npm run build
# then here
npm install
npm start        # http://localhost:4200/?appKey=your-app-key
npm run build    # static build in dist/browser
```

Add `&serverToken=...` to the URL to pass a server-issued token. The page origin must be
allowed for your app in the dashboard.
