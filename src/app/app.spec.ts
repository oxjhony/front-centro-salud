import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_BASE_URL } from './core/api';
import { SessionUser } from './core/models';

const API = 'http://api.prueba';

const user = (permissions: string[]): SessionUser => ({
  id: 'u-1',
  email: 'persona@prueba.local',
  displayName: 'Persona de Prueba',
  roles: [],
  permissions,
});

describe('App: navegación según la sesión', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const render = async (session: SessionUser | null, unread = 0) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne(`${API}/auth/me`).flush({ user: session });
    await fixture.whenStable();
    if (session) {
      // Con sesion, la cabecera consulta cuantas notificaciones hay sin leer.
      http.expectOne(`${API}/me/notifications`).flush({ items: [], unread });
      await fixture.whenStable();
    }
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return {
      element,
      links: [...element.querySelectorAll('nav a')].map((a) => a.textContent?.trim()),
    };
  };

  // Navegacion principal: la portada, los tres caminos del portal y quienes lo hacen.
  const PUBLIC = ['Inicio', 'Iniciativas', 'Recursos', 'Cursos', 'Quiénes somos', 'Nuestro equipo'];
  // Pestanas de la barra personal que tiene cualquier persona con sesion.
  const PERSONAL = ['Mi área', 'Mi perfil'];

  it('el visitante ve el portal público y el enlace para ingresar', async () => {
    const { element, links } = await render(null);

    expect(links).toEqual(PUBLIC);
    expect(element.querySelector('.session a.btn-login')?.textContent).toContain('Ingresar');
  });

  it('el autor ve además «Mis iniciativas» y «Mis recursos»', async () => {
    const { links } = await render(user(['initiative:manage', 'resource:manage', 'content:submit']));
    expect(links).toEqual([...PUBLIC, ...PERSONAL, 'Mis iniciativas', 'Mis recursos']);
  });

  it('el gestor académico ve «Mis recursos» y «Mis cursos», y no «Mis iniciativas»', async () => {
    const { links } = await render(user(['course:manage', 'resource:manage', 'content:submit']));
    expect(links).toEqual([...PUBLIC, ...PERSONAL, 'Mis recursos', 'Mis cursos']);
  });

  it('el revisor ve la bandeja de revisión', async () => {
    const { links } = await render(user(['content:review', 'content:approve', 'content:publish']));
    expect(links).toEqual([...PUBLIC, ...PERSONAL, 'Revisión']);
  });

  it('el administrador técnico ve administración, pero no la bandeja de revisión', async () => {
    const { links } = await render(user(['audit:view', 'integration:operate']));
    expect(links).toEqual([...PUBLIC, ...PERSONAL, 'Administración']);
  });

  it('con sesión muestra el nombre, el acceso a su área, las notificaciones sin leer y el botón para salir', async () => {
    const { element } = await render(user([]), 3);

    expect(element.querySelector('.session .user-pill')?.getAttribute('aria-label')).toContain('Persona de Prueba');
    expect(element.querySelector('.account-bar nav a[href="/mi-area"]')?.textContent).toContain('Mi área');
    expect(element.querySelector('.notification-badge')?.textContent).toContain('3');
    expect(element.querySelector('.session button')?.textContent).toContain('Salir');
  });

  it('sin notificaciones pendientes no muestra el contador', async () => {
    const { element } = await render(user([]), 0);
    expect(element.querySelector('.notification-badge')).toBeNull();
  });

  it('tiene un enlace para saltar al contenido y un único <main>', async () => {
    const { element } = await render(null);

    expect(element.querySelector('a.skip-link')?.getAttribute('href')).toBe('#contenido');
    expect(element.querySelectorAll('main')).toHaveLength(1);
    expect(element.querySelector('main')?.id).toBe('contenido');
  });
});
