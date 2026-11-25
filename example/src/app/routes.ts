import { Routes } from '@angular/router'
import { CaptchaPageComponent } from './captcha-page.component'
import { OtherPageComponent } from './other-page.component'

export const routes: Routes = [
  { path: '', component: CaptchaPageComponent },
  { path: 'other', component: OtherPageComponent }
]
