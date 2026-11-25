import { Component } from '@angular/core'
import { RouterLink, RouterOutlet } from '@angular/router'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <h1>CaptchaLa + Angular</h1>
    <nav>
      <a id="nav-captcha" routerLink="/" queryParamsHandling="preserve">Captcha</a>
      <a id="nav-other" routerLink="/other" queryParamsHandling="preserve">Other page</a>
    </nav>
    <router-outlet />
  `
})
export class AppComponent {}
