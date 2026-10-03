import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <h1>Ingresar</h1>

    <form (ngSubmit)="submit()">
      <div class="field">
        <label for="email">Correo</label>
        <input id="email" name="email" type="email" autocomplete="username" required [(ngModel)]="email" />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          [(ngModel)]="password"
          [attr.aria-describedby]="error() ? 'login-error' : null"
        />
      </div>

      @if (error()) {
        <p id="login-error" class="notice error" role="alert">{{ error() }}</p>
      }

      <button type="submit" [disabled]="busy()">{{ busy() ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email, this.password);
      // Solo se vuelve a rutas internas: nunca a una direccion externa recibida por parametro.
      const back = this.route.snapshot.queryParamMap.get('volver');
      await this.router.navigateByUrl(back?.startsWith('/') && !back.startsWith('//') ? back : '/');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
