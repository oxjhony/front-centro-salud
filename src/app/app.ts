import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Api } from './core/api';
import { AuthService } from './core/auth';
import { ADMIN_PERMISSIONS, Permission } from './core/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly Permission = Permission;
  protected readonly adminPermissions = ADMIN_PERMISSIONS;

  protected menuOpen = false;
  protected query = '';
  /** Notificaciones sin leer, como la campana de Moodle. */
  protected readonly unread = signal(0);

  constructor() {
    // Con sesion, el contador se carga al entrar y se refresca al navegar.
    effect(() => {
      if (this.auth.user()) void this.refreshUnread();
      else this.unread.set(0);
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.auth.user()) void this.refreshUnread();
      });
  }

  protected toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  protected closeMenu(): void {
    this.menuOpen = false;
  }

  ngOnInit(): void {
    void this.auth.ready();
  }

  protected search(): void {
    this.closeMenu();
    void this.router.navigate(['/buscar'], { queryParams: { q: this.query.trim() || null } });
    this.query = '';
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
