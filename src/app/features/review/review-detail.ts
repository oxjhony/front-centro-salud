import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { CourseDetail, InitiativeDetail, PublishableEntity, ResourceDetail, TermRef } from '../../core/models';
import { EditorialPanel } from '../../shared/editorial-panel';
import { FileSizePipe, LabelPipe, linkErrorLabel, linkStatusLabel } from '../../shared/labels';
import { namesOf } from '../../shared/taxonomy';

/** El revisor lee el contenido completo y decide: tomar, devolver, aprobar, rechazar o publicar. */
@Component({
  selector: 'app-review-detail',
  imports: [RouterLink, DatePipe, LabelPipe, FileSizePipe, EditorialPanel],
  template: `
    <p><a routerLink="/revision">← Bandeja de revisión</a></p>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }

    @if (initiative(); as item) {
      <h1>{{ item.title }}</h1>
      <p class="meta">Iniciativa · {{ item.type | label }}</p>
      <p>{{ item.summary }}</p>
      <dl class="details">
        <dt>Autores</dt>
        <dd>{{ authorNames(item) }}</dd>
        <dt>Clasificación</dt>
        <dd>{{ names(item.terms) || 'Sin clasificar' }}</dd>
        <dt>Fechas</dt>
        <dd>{{ item.startDate || 'Sin fecha de inicio' }} – {{ item.endDate || 'sin fecha de cierre' }}</dd>
        <dt>Resultados</dt>
        <dd>{{ item.results || 'Sin resultados reportados' }}</dd>
        <dt>Recursos asociados</dt>
        <dd>
          @for (resource of item.resources; track resource.id) {
            {{ resource.title }} ({{ resource.state | label }})<br />
          } @empty {
            Ninguno
          }
        </dd>
      </dl>
    }

    @if (resource(); as item) {
      <h1>{{ item.title }}</h1>
      <p class="meta">Recurso · {{ item.visibility | label }} · Licencia {{ item.license }}</p>
      <p>{{ item.description }}</p>
      <dl class="details">
        <dt>Autor</dt>
        <dd>{{ item.ownerName }}</dd>
        <dt>Clasificación</dt>
        <dd>{{ names(item.terms) || 'Sin clasificar' }}</dd>
      </dl>
      <h2>Versiones</h2>
      <ul class="related-list">
        @for (version of item.versions; track version.id) {
          <li>
            <a [href]="downloadUrl(item.id, version.id)" download>v{{ version.versionNumber }} · {{ version.originalFilename }}</a>
            <span class="meta"> · {{ version.sizeBytes | fileSize }} · {{ version.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </li>
        }
      </ul>
    }

    @if (course(); as item) {
      <h1>{{ item.title }}</h1>
      <p class="meta">Curso · {{ item.type | label }} · {{ item.modality | label }}</p>
      <p>{{ item.summary }}</p>
      <dl class="details">
        <dt>Clasificación</dt>
        <dd>{{ names(item.terms) || 'Sin clasificar' }}</dd>
        <dt>Requisitos</dt>
        <dd>{{ item.requirements || 'Ninguno' }}</dd>
        <dt>Enlace con Moodle</dt>
        <dd>
          <span class="state" [attr.data-state]="item.link.status">{{ linkStatus(item.link.status) }}</span>
          @if (item.link.status === 'VERIFIED') {
            <a [href]="item.link.url" rel="noopener">{{ item.link.url }}</a>
          } @else if (item.link.error) {
            {{ linkError(item.link.error) }}
          }
        </dd>
        <dt>Instrucción de acceso</dt>
        <dd>{{ item.accessInstructions || 'Ninguna' }}</dd>
      </dl>
    }

    @if (state(); as current) {
      <app-editorial-panel [entityType]="entityType()" [entityId]="id()" [state]="current" (changed)="state.set($event)" />
    }
  `,
})
export class ReviewDetail implements OnInit {
  private readonly api = inject(Api);

  /** Parametros de la ruta. */
  readonly entityType = input.required<PublishableEntity>();
  readonly id = input.required<string>();

  protected readonly initiative = signal<InitiativeDetail | null>(null);
  protected readonly resource = signal<ResourceDetail | null>(null);
  protected readonly course = signal<CourseDetail | null>(null);
  protected readonly state = signal('');
  protected readonly error = signal('');
  protected readonly linkStatus = linkStatusLabel;
  protected readonly linkError = linkErrorLabel;

  async ngOnInit(): Promise<void> {
    try {
      const id = this.id();
      switch (this.entityType()) {
        case 'courses': {
          const course = await this.api.course(id);
          this.course.set(course);
          this.state.set(course.state);
          break;
        }
        case 'resources': {
          const resource = await this.api.resource(id);
          this.resource.set(resource);
          this.state.set(resource.state);
          break;
        }
        default: {
          const initiative = await this.api.initiative(id);
          this.initiative.set(initiative);
          this.state.set(initiative.state);
        }
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected names(terms: TermRef[]): string {
    return namesOf(terms);
  }

  protected downloadUrl(resourceId: string, versionId: string): string {
    return this.api.versionDownloadUrl(resourceId, versionId);
  }

  protected authorNames(initiative: InitiativeDetail): string {
    return initiative.authors.map((author) => author.displayName).join(', ');
  }
}
