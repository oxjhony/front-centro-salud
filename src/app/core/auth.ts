import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, PendingTasks, PLATFORM_ID, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api, API_BASE_URL } from './api';
import { SessionUser } from './models';

/**
 * Sesion del usuario. La cookie de sesion es httpOnly: el navegador la envia, pero este codigo
 * nunca la lee. Lo que aqui se guarda sirve solo para decidir que mostrar; quien autoriza cada
 * operacion es la API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tasks = inject(PendingTasks);
  private loading?: Promise<void>;

  readonly user = signal<SessionUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  /**
   * Consulta la sesion una sola vez. En el servidor no se consulta: alli no viaja la cookie, y la
   * respuesta "sin sesion" se reutilizaria en el navegador como si fuera cierta.
   */
  ready(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    if (!this.loading) {
      const loading = this.api
        .me()
        .then((user) => this.user.set(user))
        .catch(() => this.user.set(null));
      // La aplicacion no se considera estable hasta saber si hay sesion.
      this.tasks.run(() => loading);
      this.loading = loading;
    }
    return this.loading;
  }

  can(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  canAny(permissions: string[]): boolean {
    return permissions.some((permission) => this.can(permission));
  }

  async login(email: string, password: string): Promise<void> {
    this.user.set(await this.api.login(email, password));
    this.loading = Promise.resolve();
  }

  async logout(): Promise<void> {
    await this.api.logout();
    this.user.set(null);
  }
}

/** Envia la cookie de sesion solo a la API, nunca a otros destinos. */
export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(API_BASE_URL);
  return next(request.url.startsWith(apiUrl + '/') ? request.clone({ withCredentials: true }) : request);
};

/**
 * Guarda de ruta: exige sesion y al menos uno de los permisos. Es solo comodidad de navegacion;
 * el control de acceso real esta en la API, que valida cada operacion.
 */
export function requirePermission(...permissions: string[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ready();
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
    }
    return auth.canAny(permissions) ? true : router.createUrlTree(['/']);
  };
}

/** Guarda de ruta para lo que es de cualquier persona con sesion: su perfil, sus avisos, su area. */
export function requireSession(): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ready();
    return auth.isAuthenticated() ? true : router.createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
  };
}
