import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { API_BASE_URL } from './api';
import { AuthService, credentialsInterceptor, requirePermission } from './auth';
import { SessionUser } from './models';

const API = 'http://api.prueba';

const AUTHOR: SessionUser = {
  id: 'u-1',
  email: 'autor@prueba.local',
  displayName: 'Andrea Autora',
  roles: ['AUTHOR'],
  permissions: ['content:submit', 'initiative:manage'],
};

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: API },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carga la sesión desde la API y expone al usuario', async () => {
    const { auth, http } = setup();

    const ready = auth.ready();
    http.expectOne(`${API}/auth/me`).flush({ user: AUTHOR });
    await ready;

    expect(auth.user()).toEqual(AUTHOR);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('sin sesión el usuario es null y no tiene ningún permiso', async () => {
    const { auth, http } = setup();

    const ready = auth.ready();
    http.expectOne(`${API}/auth/me`).flush({ user: null });
    await ready;

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.can('initiative:manage')).toBe(false);
  });

  it('consulta la sesión una sola vez aunque se pida varias veces', async () => {
    const { auth, http } = setup();

    const all = Promise.all([auth.ready(), auth.ready(), auth.ready()]);
    http.expectOne(`${API}/auth/me`).flush({ user: AUTHOR });
    await all;
    await auth.ready();

    http.expectNone(`${API}/auth/me`);
  });

  it('si la API no responde, trata al usuario como sin sesión en lugar de fallar', async () => {
    const { auth, http } = setup();

    const ready = auth.ready();
    http.expectOne(`${API}/auth/me`).error(new ProgressEvent('error'));
    await ready;

    expect(auth.user()).toBeNull();
  });

  it('en el servidor no consulta la sesión: allí no viaja la cookie', async () => {
    const { auth, http } = setup('server');

    await auth.ready();

    http.expectNone(`${API}/auth/me`);
    expect(auth.user()).toBeNull();
  });

  it('can y canAny responden según los permisos del usuario', async () => {
    const { auth, http } = setup();
    const ready = auth.ready();
    http.expectOne(`${API}/auth/me`).flush({ user: AUTHOR });
    await ready;

    expect(auth.can('initiative:manage')).toBe(true);
    expect(auth.can('content:publish')).toBe(false);
    expect(auth.canAny(['content:publish', 'content:submit'])).toBe(true);
    expect(auth.canAny(['user:manage', 'audit:view'])).toBe(false);
  });

  it('iniciar sesión guarda al usuario; cerrar sesión lo borra', async () => {
    const { auth, http } = setup();

    const login = auth.login('autor@prueba.local', 'clave');
    const request = http.expectOne(`${API}/auth/login`);
    expect(request.request.body).toEqual({ email: 'autor@prueba.local', password: 'clave' });
    request.flush({ user: AUTHOR });
    await login;
    expect(auth.user()).toEqual(AUTHOR);

    const logout = auth.logout();
    http.expectOne(`${API}/auth/logout`).flush(null);
    await logout;
    expect(auth.user()).toBeNull();
  });

  it('un inicio de sesión rechazado no deja a nadie autenticado', async () => {
    const { auth, http } = setup();

    const login = auth.login('autor@prueba.local', 'mala');
    http.expectOne(`${API}/auth/login`).flush({ message: 'Correo o contraseña incorrectos.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(login).rejects.toBeTruthy();
    expect(auth.isAuthenticated()).toBe(false);
  });
});

describe('credentialsInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('envía la cookie de sesión a la API', () => {
    const { http } = setup();
    TestBed.inject(HttpClient).get(`${API}/initiatives/mine`).subscribe();

    const request = http.expectOne(`${API}/initiatives/mine`);
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('no envía la cookie a otros destinos, ni a uno cuyo nombre empieza igual', () => {
    const { http } = setup();
    const client = TestBed.inject(HttpClient);

    for (const url of ['https://otro-sitio.example/datos', `${API}.sitio-ajeno.example/robo`]) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.withCredentials).toBe(false);
      request.flush({});
    }
  });
});

describe('requirePermission', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  const run = async (user: SessionUser | null, ...permissions: string[]) => {
    const { http } = setup();
    const state = { url: '/mis-iniciativas/nueva' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      requirePermission(...permissions)({} as ActivatedRouteSnapshot, state),
    ) as Promise<boolean | UrlTree>;
    http.expectOne(`${API}/auth/me`).flush({ user });
    return result;
  };

  it('deja pasar a quien tiene el permiso', async () => {
    expect(await run(AUTHOR, 'initiative:manage')).toBe(true);
  });

  it('basta con uno de los permisos indicados', async () => {
    expect(await run(AUTHOR, 'user:manage', 'content:submit')).toBe(true);
  });

  it('sin sesión redirige a ingresar y recuerda a dónde quería ir', async () => {
    const result = (await run(null, 'initiative:manage')) as UrlTree;
    expect(result.toString()).toBe('/ingresar?volver=%2Fmis-iniciativas%2Fnueva');
  });

  it('con sesión pero sin el permiso redirige al inicio', async () => {
    const result = (await run(AUTHOR, 'user:manage')) as UrlTree;
    expect(result.toString()).toBe('/');
  });
});
