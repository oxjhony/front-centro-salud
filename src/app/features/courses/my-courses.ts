import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { CourseSummary } from '../../core/models';
import { LabelPipe, linkStatusLabel } from '../../shared/labels';

@Component({
  selector: 'app-my-courses',
  imports: [RouterLink, LabelPipe],
  template: `
    <h1>Mis cursos</h1>
    <p><a class="button" routerLink="/mis-cursos/nuevo">Nueva ficha de curso</a></p>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (courses(); as items) {
      @if (items.length === 0) {
        <div class="notice">
          <p><strong>Todavía no has creado fichas de curso.</strong></p>
          <p>Crea la primera con el botón «Nueva ficha de curso» y enlázala con su aula en Moodle.</p>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Estado</th>
                <th scope="col">Enlace con Moodle</th>
              </tr>
            </thead>
            <tbody>
              @for (course of items; track course.id) {
                <tr>
                  <td><a [routerLink]="['/mis-cursos', course.id]">{{ course.title }}</a></td>
                  <td><span class="state" [attr.data-state]="course.state">{{ course.state | label }}</span></td>
                  <td><span class="state" [attr.data-state]="course.link.status">{{ linkStatus(course.link.status) }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <p>Cargando…</p>
    }
  `,
})
export class MyCourses implements OnInit {
  private readonly api = inject(Api);

  protected readonly courses = signal<CourseSummary[] | null>(null);
  protected readonly error = signal('');
  protected readonly linkStatus = linkStatusLabel;

  async ngOnInit(): Promise<void> {
    try {
      this.courses.set(await this.api.myCourses());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
