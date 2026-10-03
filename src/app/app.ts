import { isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, OnInit, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Api } from './core/api';
import { AuthService } from './core/auth';
import { ADMIN_PERMISSIONS, Permission } from './core/models';
import { Breadcrumbs } from './shared/breadcrumbs';
import { Icon } from './shared/icon';

/** Permisos que abren alguna vista del espacio de trabajo. */
const WORKSPACE_PERMISSIONS: string[] = [
  Permission.InitiativeManage,
  Permission.ResourceManage,
  Permission.CourseManage,
  Permission.ContentReview,
  ...ADMIN_PERMISSIONS,
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Breadcrumbs, Icon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  /** Pestanas de la barra personal; solo existen con sesion. */
  private readonly tabs = viewChild<ElementRef<HTMLElement>>('tabs');

  protected readonly Permission = Permission;
  protected readonly adminPermissions = ADMIN_PERMISSIONS;
  protected readonly hasWorkspace = computed(() => this.auth.canAny(WORKSPACE_PERMISSIONS));

  /** Notificaciones sin leer, como la campana de Moodle. */
  protected readonly unread = signal(0);
  /** Una marca por valor: cuando el numero cambia, el pulso de la campana vuelve a empezar. */
  protected readonly unreadMarks = computed(() => (this.unread() > 0 ? [this.unread()] : []));
  /** Titulo de la pagina a la que se acaba de llegar, para los lectores de pantalla. */
  protected readonly announcement = signal('');

  /** Ruta de la ultima pagina visitada, sin parametros; `null` antes de la primera navegacion. */
  private readonly path = signal<string | null>(null);

  constructor() {
    // Con sesion, el contador se carga al entrar y se refresca al navegar.
    effect(() => {
      if (this.auth.user()) void this.refreshUnread();
      else this.unread.set(0);
    });
    // En pantallas estrechas las pestanas se desplazan de lado: la activa queda siempre a la vista.
    effect(() => {
      const tabs = this.tabs()?.nativeElement;
      this.path();
      // La pestana activa se marca despues de este ciclo.
      if (tabs && this.isBrowser) setTimeout(() => this.revealActiveTab(tabs));
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.auth.user()) void this.refreshUnread();
        this.arrive();
      });
  }

  ngOnInit(): void {
    void this.auth.ready();
  }

  /**
   * Al cambiar de pagina, el foco y el lector de pantalla llegan con la persona. Aplicar un
   * filtro cambia solo los parametros: ahi el foco se queda donde estaba.
   */
  private arrive(): void {
    const previous = this.path();
    const path = this.router.url.split(/[?#]/)[0];
    this.path.set(path);
    if (previous === null || previous === path || !this.isBrowser) return;

    this.main().nativeElement.focus({ preventScroll: true });
    // El titulo de la ruta se escribe justo despues de este evento.
    queueMicrotask(() => this.announcement.set(this.title.getTitle()));
  }

  private revealActiveTab(tabs: HTMLElement): void {
    const active = tabs.querySelector('a.active');
    if (active) tabs.scrollLeft += active.getBoundingClientRect().left - tabs.getBoundingClientRect().left - 16;
  }

  /** Con `<base href="/">` un enlace `#contenido` recargaria la portada: el salto se hace a mano. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    const main = this.main().nativeElement;
    main.focus();
    main.scrollIntoView();
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  private async refreshUnread(): Promise<void> {
    try {
      this.unread.set((await this.api.notifications()).unread);
    } catch {
      this.unread.set(0);
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
