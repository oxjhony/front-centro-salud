import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errorMessage } from '../../core/api';
import { Profile, ProfileInput } from '../../core/models';

/**
 * Perfil minimo (RF-02): solo datos opcionales y no sensibles. La persona los consulta, los
 * corrige y puede borrarlos. La contrasena no vive aqui: la gestiona el proveedor de identidad.
 */
@Component({
  selector: 'app-profile',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Mi perfil</h1>

    @if (profile(); as current) {
      <p class="meta">Correo: {{ current.email }} · Última actualización: {{ current.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</p>

      <form (ngSubmit)="save()">
        <fieldset [disabled]="busy()" style="border: 0; padding: 0; max-width: none">
          <div class="field">
            <label for="displayName">Nombre para mostrar</label>
            <input id="displayName" name="displayName" type="text" required minlength="2" maxlength="150" [(ngModel)]="model.displayName" />
          </div>
          <div class="field">
            <label for="affiliation">Afiliación (opcional)</label>
            <input id="affiliation" name="affiliation" type="text" maxlength="255" [(ngModel)]="model.affiliation" aria-describedby="affiliation-hint" />
            <p id="affiliation-hint" class="hint">Institución u organización a la que perteneces.</p>
          </div>
          <div class="field">
            <label for="generalTerritory">Territorio (opcional)</label>
            <input id="generalTerritory" name="generalTerritory" type="text" maxlength="150" [(ngModel)]="model.generalTerritory" aria-describedby="territory-hint" />
            <p id="territory-hint" class="hint">Solo el municipio o departamento, nunca una dirección.</p>
          </div>
          <div class="field">
            <label for="interests">Intereses (opcional)</label>
            <input id="interests" name="interests" type="text" [(ngModel)]="interests" aria-describedby="interests-hint" />
            <p id="interests-hint" class="hint">Separados por comas, por ejemplo: salud mental, nutrición.</p>
          </div>
          <div class="field">
            <label>
              <input type="checkbox" name="notificationOptIn" [(ngModel)]="model.notificationOptIn" />
              Quiero recibir avisos por correo además de los avisos en la plataforma
            </label>
          </div>
          <div class="actions">
            <button type="submit">{{ busy() ? 'Guardando…' : 'Guardar cambios' }}</button>
            <button type="button" class="secondary" (click)="clear()">Borrar mis datos opcionales</button>
          </div>
        </fieldset>
      </form>
    } @else if (!error()) {
      <p>Cargando…</p>
    }

    @if (notice()) {
      <p class="notice ok" role="status">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }
  `,
})
export class ProfilePage implements OnInit {
  private readonly api = inject(Api);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected model: ProfileInput = { displayName: '', affiliation: null, generalTerritory: null, interests: [], notificationOptIn: false };
  protected interests = '';

  async ngOnInit(): Promise<void> {
    try {
      this.show(await this.api.profile());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private show(profile: Profile): void {
    this.profile.set(profile);
    const { email: _email, updatedAt: _updatedAt, ...model } = profile;
    this.model = model;
    this.interests = profile.interests.join(', ');
  }

  private async run(work: () => Promise<Profile>, done: string): Promise<void> {
    this.busy.set(true);
    this.notice.set('');
    this.error.set('');
    try {
      this.show(await work());
      this.notice.set(done);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected save(): Promise<void> {
    const input: ProfileInput = {
      ...this.model,
      affiliation: this.model.affiliation || null,
      generalTerritory: this.model.generalTerritory || null,
      interests: this.interests
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean),
    };
    return this.run(() => this.api.updateProfile(input), 'Perfil actualizado.');
  }

  protected clear(): Promise<void> {
    return this.run(() => this.api.clearOptionalData(), 'Se borraron tus datos opcionales.');
  }
}
