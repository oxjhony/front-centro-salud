import { Component, inject, input, OnInit, PendingTasks, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { PublicCourse } from '../../core/models';
import { LabelPipe } from '../../shared/labels';
import { namesOf } from '../../shared/taxonomy';
import { CourseAccessView } from './course-access';

/** Ficha publica de un curso (H-26): la entrada del catalogo y el camino al aula en Moodle. */
@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, LabelPipe, CourseAccessView],
  template: `
    <p><a routerLink="/cursos">← Todos los cursos</a></p>

    @if (course(); as item) {
      <article>
        <h1>{{ item.title }}</h1>
        <p class="meta">{{ item.type | label }} · {{ item.modality | label }}</p>
        <p>{{ item.summary }}</p>

        <dl class="details">
          @if (item.duration) {
            <dt>Duración</dt>
            <dd>{{ item.duration }}</dd>
          }
          @if (item.startDate) {
            <dt>Inicio</dt>
            <dd>{{ item.startDate }}</dd>
          }
          @if (item.endDate) {
            <dt>Cierre</dt>
            <dd>{{ item.endDate }}</dd>
          }
          @if (item.capacity) {
            <dt>Cupos</dt>
            <dd>{{ item.capacity }}</dd>
          }
          @if (names(item, 'THEME'); as themes) {
            <dt>Temas</dt>
            <dd>{{ themes }}</dd>
          }
          @if (names(item, 'POPULATION'); as populations) {
            <dt>Dirigido a</dt>
            <dd>{{ populations }}</dd>
          }
          @if (item.requirements) {
            <dt>Requisitos</dt>
            <dd>{{ item.requirements }}</dd>
          }
        </dl>

        <h2>Acceso</h2>
        <app-course-access [access]="item.access" [courseTitle]="item.title" />
        <p class="meta">La inscripción, el avance y las calificaciones se gestionan en el aula virtual (Moodle).</p>

        @if (item.resources.length) {
          <h2>Recursos del curso</h2>
          <ul class="related-list">
            @for (resource of item.resources; track resource.id) {
              <li><a [routerLink]="['/recursos', resource.id]">{{ resource.title }}</a></li>
            }
          </ul>
        }
        @if (item.initiatives.length) {
          <h2>Iniciativas relacionadas</h2>
          <ul class="related-list">
            @for (initiative of item.initiatives; track initiative.id) {
              <li><a [routerLink]="['/iniciativas', initiative.id]">{{ initiative.title }}</a></li>
            }
          </ul>
        }
      </article>
    } @else if (missing()) {
      <h1>Curso no disponible</h1>
      <p>Este curso no existe o todavía no está publicado.</p>
    } @else {
      <p>Cargando…</p>
    }
  `,
})
export class CourseDetailPage implements OnInit {
  private readonly api = inject(Api);
  private readonly tasks = inject(PendingTasks);

  /** Parametro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly course = signal<PublicCourse | null>(null);
  protected readonly missing = signal(false);

  ngOnInit(): void {
    this.tasks.run(async () => {
      try {
        this.course.set(await this.api.publicCourse(this.id()));
      } catch {
        this.missing.set(true);
      }
    });
  }

  protected names(item: PublicCourse, type: 'THEME' | 'POPULATION'): string {
    return namesOf(item.terms, type);
  }
}
