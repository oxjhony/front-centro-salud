import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon } from './icon';

export interface Crumb {
  label: string;
  /** Sin enlace, la miga es la pagina actual. */
  link: string | null;
}

interface Section {
  label: string;
  /** Las vistas de gestion cuelgan de «Mi área», no del portal publico. */
  workspace?: boolean;
  /** Nombre de la pagina que cuelga de la seccion, segun el segundo segmento de la ruta. */
  child?: (segment: string) => string;
}

const SECTIONS: Record<string, Section> = {
  iniciativas: { label: 'Iniciativas', child: () => 'Ficha de la iniciativa' },
  recursos: { label: 'Recursos', child: () => 'Ficha del recurso' },
  cursos: { label: 'Cursos', child: () => 'Ficha del curso' },
  buscar: { label: 'Buscar' },
  ingresar: { label: 'Ingresar' },
  'mi-area': { label: 'Mi área' },
  'mi-perfil': { label: 'Mi perfil', workspace: true },
  notificaciones: { label: 'Notificaciones', workspace: true },
  'mis-iniciativas': {
    label: 'Mis iniciativas',
    workspace: true,
    child: (segment) => (segment === 'nueva' ? 'Nueva iniciativa' : 'Editar iniciativa'),
  },
  'mis-recursos': {
    label: 'Mis recursos',
    workspace: true,
    child: (segment) => (segment === 'nuevo' ? 'Nuevo recurso' : 'Editar recurso'),
  },
  'mis-cursos': {
    label: 'Mis cursos',
    workspace: true,
    child: (segment) => (segment === 'nuevo' ? 'Nueva ficha de curso' : 'Editar ficha de curso'),
  },
  revision: { label: 'Revisión', workspace: true, child: () => 'Revisar contenido' },
  administracion: { label: 'Administración', workspace: true },
};

/** Camino desde el inicio hasta la pagina de una URL. La portada no tiene migas. */
export function breadcrumbsFor(url: string): Crumb[] {
  const segments = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: 'Inicio', link: '/' }];
  const section = SECTIONS[segments[0]];
  if (!section) return [...crumbs, { label: 'Página no encontrada', link: null }];

  if (section.workspace) crumbs.push({ label: 'Mi área', link: '/mi-area' });
  const child = segments.length > 1 ? section.child?.(segments[1]) : undefined;
  crumbs.push({ label: section.label, link: child ? `/${segments[0]}` : null });
  if (child) crumbs.push({ label: child, link: null });
  return crumbs;
}

/** Migas de pan: en que parte del portal esta la persona y como volver un nivel. */
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink, Icon],
  template: `
    @if (crumbs().length) {
      <nav class="breadcrumbs wrap" aria-label="Ruta de navegación">
        <ol>
          @for (crumb of crumbs(); track crumb.label) {
            <li>
              @if (crumb.link) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
              } @else {
                <span aria-current="page"><app-icon name="map-pin" />{{ crumb.label }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
})
export class Breadcrumbs {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly crumbs = computed(() => breadcrumbsFor(this.url()));
}
