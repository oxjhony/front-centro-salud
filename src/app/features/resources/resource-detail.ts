import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, PendingTasks, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth';
import { PublicResource, TaxonomyType } from '../../core/models';
import { Icon } from '../../shared/icon';
import { FileSizePipe, LabelPipe } from '../../shared/labels';
import { namesOf } from '../../shared/taxonomy';

/**
 * Ficha publica de un recurso. Un recurso de acceso abierto se descarga sin sesion; uno restringido
 * se describe igual, pero para descargarlo hay que ingresar (RF-05). La API vuelve a decidirlo.
 */
@Component({
  selector: 'app-resource-detail',
  imports: [RouterLink, DatePipe, LabelPipe, FileSizePipe, Icon],
  template: `
    @if (resource(); as item) {
      <article>
        <h1>{{ item.title }}</h1>
        <p class="meta">{{ item.visibility | label }} · Licencia {{ item.license }}</p>
        <p class="lead">{{ item.description }}</p>

        <dl class="details">
          <dt>Autoría</dt>
          <dd>{{ item.author }}</dd>
          @for (group of groups; track group.type) {
            @if (names(item, group.type); as text) {
              <dt>{{ group.label }}</dt>
              <dd>{{ text }}</dd>
            }
          }
          @if (item.publishedAt) {
            <dt>Publicado</dt>
            <dd>{{ item.publishedAt | date: 'dd/MM/yyyy' }}</dd>
          }
        </dl>

        <h2>Archivo</h2>
        @if (item.file; as file) {
          <p>
            {{ file.originalFilename }} · {{ file.sizeBytes | fileSize }} · versión {{ file.versionNumber }}
            del {{ file.uploadedAt | date: 'dd/MM/yyyy' }}
          </p>
          @if (item.visibility === 'PUBLIC' || auth.isAuthenticated()) {
            <p>
              <a class="button" [href]="downloadUrl(item)" download>
                <app-icon name="download" />Descargar<span class="visually-hidden"> {{ item.title }}</span>
              </a>
            </p>
          } @else {
            <div class="notice">
              <p><strong>Este recurso es de acceso restringido.</strong></p>
              <p><a routerLink="/ingresar" [queryParams]="{ volver: '/recursos/' + item.id }">Ingresa</a> para descargarlo.</p>
            </div>
          }
        } @else {
          <p class="meta">Este recurso no tiene archivo disponible.</p>
        }

        @if (item.initiatives.length) {
          <h2>Iniciativas relacionadas</h2>
          <ul class="related-list">
            @for (initiative of item.initiatives; track initiative.id) {
              <li><a [routerLink]="['/iniciativas', initiative.id]">{{ initiative.title }}</a></li>
            }
          </ul>
        }
        @if (item.courses.length) {
          <h2>Cursos que lo usan</h2>
          <ul class="related-list">
            @for (course of item.courses; track course.id) {
              <li><a [routerLink]="['/cursos', course.id]">{{ course.title }}</a></li>
            }
          </ul>
        }
      </article>
    } @else if (missing()) {
      <h1>Recurso no disponible</h1>
      <p>Este recurso no existe o todavía no está publicado.</p>
    } @else {
      <p class="loading" role="status">Cargando…</p>
    }
  `,
})
export class ResourceDetailPage implements OnInit {
  private readonly api = inject(Api);
  private readonly tasks = inject(PendingTasks);
  protected readonly auth = inject(AuthService);

  /** Parametro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly resource = signal<PublicResource | null>(null);
  protected readonly missing = signal(false);
  protected readonly groups: { type: TaxonomyType; label: string }[] = [
    { type: 'RESOURCE_TYPE', label: 'Tipo de recurso' },
    { type: 'THEME', label: 'Temas' },
    { type: 'TERRITORY', label: 'Territorios' },
    { type: 'POPULATION', label: 'Poblaciones' },
    { type: 'TAG', label: 'Etiquetas' },
  ];

  ngOnInit(): void {
    void this.auth.ready();
    this.tasks.run(async () => {
      try {
        this.resource.set(await this.api.publicResource(this.id()));
      } catch {
        this.missing.set(true);
      }
    });
  }

  protected names(item: PublicResource, type: TaxonomyType): string {
    return namesOf(item.terms, type);
  }

  protected downloadUrl(item: PublicResource): string {
    return this.api.publicDownloadUrl(item.id);
  }
}
