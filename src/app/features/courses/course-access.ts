import { Component, input } from '@angular/core';
import { CourseAccess } from '../../core/models';

/**
 * Como entra el visitante a un curso (RF-06): el enlace al aula en Moodle cuando la plataforma lo
 * tiene verificado; si no, la instruccion de acceso que dejo el gestor academico.
 */
@Component({
  selector: 'app-course-access',
  template: `
    @switch (access().kind) {
      @case ('LMS') {
        <p>
          <a class="button" [href]="url()" rel="noopener">
            Ir al aula virtual<span class="visually-hidden"> de {{ courseTitle() }}</span>
          </a>
        </p>
      }
      @case ('INSTRUCTIONS') {
        <div class="notice">
          <strong>Cómo ingresar:</strong>
          {{ instructions() }}
        </div>
      }
      @default {
        <p class="meta">El acceso a este curso todavía no está disponible.</p>
      }
    }
  `,
})
export class CourseAccessView {
  readonly access = input.required<CourseAccess>();
  readonly courseTitle = input('');

  protected url(): string {
    const access = this.access();
    return access.kind === 'LMS' ? access.url : '';
  }

  protected instructions(): string {
    const access = this.access();
    return access.kind === 'INSTRUCTIONS' ? access.text : '';
  }
}
