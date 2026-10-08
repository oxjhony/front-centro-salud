import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';
import { Reveal, RevealText } from '../../shared/reveal';

const ABOUT = {
  title: 'Conocimiento en salud pública al servicio de los territorios',
  paragraphs: [
    'Somos el Centro Virtual de Salud Pública de la Facultad de Ciencias para la Salud de la Universidad de Caldas: una plataforma de gestión del conocimiento y oferta formativa para fortalecer la salud pública y el bienestar en los territorios de Caldas y Colombia.',
    'Reunimos en un solo lugar las iniciativas que se desarrollan con las comunidades, los recursos que produce y revisa el equipo docente y los cursos que se ofrecen en el aula virtual, para que cualquier persona pueda encontrarlos, usarlos y compartirlos.',
  ],
};

@Component({
  selector: 'app-about',
  imports: [RouterLink, Icon, Reveal, RevealText],
  template: `
    <section class="split about" appReveal aria-labelledby="about-title">
      <header class="section-head">
        <p class="eyebrow reveal-item">Quiénes somos</p>
        <h1 id="about-title"><app-reveal-text [text]="about.title" /></h1>
      </header>

      <div class="about-text">
        @for (paragraph of about.paragraphs; track paragraph) {
          <p><app-reveal-text [text]="paragraph" /></p>
        }
        <p class="actions reveal-item">
          <a class="button" routerLink="/nuestro-equipo">Conoce a nuestro equipo<app-icon name="arrow-right" /></a>
        </p>
      </div>
    </section>
  `,
})
export class About {
  protected readonly about = ABOUT;
}
