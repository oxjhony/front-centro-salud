import { Component } from '@angular/core';
import { Icon } from '../../shared/icon';
import { Reveal, RevealText } from '../../shared/reveal';

/** Las areas del equipo. Los nombres y fotos de las personas se agregan aqui cuando esten definidos. */
const TEAM = {
  title: 'Las personas detrás del Centro',
  intro: 'Docentes, investigadores y profesionales de apoyo que trabajan juntos para que el conocimiento llegue a donde se necesita.',
  members: [
    { icon: 'compass', role: 'Dirección del Centro', text: 'Orienta la estrategia y articula el Centro con la Facultad y con las instituciones aliadas.' },
    { icon: 'graduation-cap', role: 'Coordinación académica', text: 'Diseña la oferta de formación y acompaña a los docentes que crean cada curso.' },
    { icon: 'shield-check', role: 'Revisión editorial', text: 'Revisa y valida las iniciativas y los recursos antes de publicarlos.' },
    { icon: 'mountain', role: 'Gestión territorial', text: 'Mantiene el vínculo con los municipios y las comunidades de Caldas.' },
  ],
};

@Component({
  selector: 'app-team',
  imports: [Icon, Reveal, RevealText],
  template: `
    <section appReveal aria-labelledby="team-title">
      <header class="section-head">
        <p class="eyebrow reveal-item">Nuestro equipo</p>
        <h1 id="team-title"><app-reveal-text [text]="team.title" /></h1>
        <p><app-reveal-text [text]="team.intro" /></p>
      </header>

      <ul class="team">
        @for (member of team.members; track member.role; let index = $index) {
          <li class="reveal-item" [style.--i]="index">
            <app-icon [name]="member.icon" />
            <h3>{{ member.role }}</h3>
            <p>{{ member.text }}</p>
          </li>
        }
      </ul>
    </section>
  `,
})
export class Team {
  protected readonly team = TEAM;
}
