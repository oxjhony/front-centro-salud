import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../core/api';
import { AvailableTransition, ReviewEntry } from '../core/models';
import { EditorialPanel } from './editorial-panel';

const API = 'http://api.prueba';
const ID = '11111111-1111-4111-8111-111111111111';

describe('EditorialPanel', () => {
  let fixture: ComponentFixture<EditorialPanel>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: API }],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  /** Pinta el panel y responde las dos consultas con las que arranca. */
  const render = async (state: string, transitions: AvailableTransition[], history: ReviewEntry[] = []) => {
    fixture = TestBed.createComponent(EditorialPanel);
    fixture.componentRef.setInput('entityType', 'initiatives');
    fixture.componentRef.setInput('entityId', ID);
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();
    http.expectOne(`${API}/editorial/initiatives/${ID}/transitions`).flush(transitions);
    http.expectOne(`${API}/editorial/initiatives/${ID}/history`).flush(history);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const buttons = (element: HTMLElement) => [...element.querySelectorAll('button')] as HTMLButtonElement[];
  const buttonTexts = (element: HTMLElement) => buttons(element).map((b) => b.textContent?.trim());

  it('dice el estado con texto, no solo con color', async () => {
    const element = await render('RETURNED', []);
    expect(element.querySelector('.state')?.textContent).toContain('Devuelto con observaciones');
  });

  it('ofrece solo las acciones que la API declara disponibles', async () => {
    const element = await render('DRAFT', [{ to: 'SUBMITTED', requiresComment: false }]);
    expect(buttonTexts(element)).toEqual(['Enviar a revisión']);
  });

  it('sin acciones disponibles lo explica en lugar de dejar el panel vacío', async () => {
    const element = await render('SUBMITTED', []);
    expect(buttons(element)).toHaveLength(0);
    expect(element.textContent).toContain('No tienes acciones disponibles');
  });

  it('una acción que exige comentario queda deshabilitada hasta escribirlo', async () => {
    const element = await render('IN_REVIEW', [
      { to: 'RETURNED', requiresComment: true },
      { to: 'APPROVED', requiresComment: false },
    ]);
    const [devolver, aprobar] = buttons(element);

    expect(devolver.disabled).toBe(true);
    expect(aprobar.disabled).toBe(false);

    const comment = element.querySelector('textarea') as HTMLTextAreaElement;
    comment.value = 'Falta precisar los territorios.';
    comment.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(devolver.disabled).toBe(false);
  });

  it('un comentario de solo espacios no habilita la acción', async () => {
    const element = await render('IN_REVIEW', [{ to: 'RETURNED', requiresComment: true }]);

    const comment = element.querySelector('textarea') as HTMLTextAreaElement;
    comment.value = '    ';
    comment.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(buttons(element)[0].disabled).toBe(true);
  });

  it('al ejecutar la acción envía el destino y el comentario, y avisa el nuevo estado', async () => {
    const element = await render('IN_REVIEW', [{ to: 'RETURNED', requiresComment: true }]);
    const emitted: string[] = [];
    fixture.componentInstance.changed.subscribe((state) => emitted.push(state));

    const comment = element.querySelector('textarea') as HTMLTextAreaElement;
    comment.value = 'Falta precisar los territorios.';
    comment.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    buttons(element)[0].click();

    const request = http.expectOne(`${API}/editorial/initiatives/${ID}/transitions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ to: 'RETURNED', comment: 'Falta precisar los territorios.' });
    request.flush({ state: 'RETURNED' });
    await fixture.whenStable();

    expect(emitted).toEqual(['RETURNED']);
  });

  it('si la API rechaza la transición muestra el motivo y no avisa ningún cambio', async () => {
    const element = await render('APPROVED', [{ to: 'PUBLISHED', requiresComment: false }]);
    const emitted: string[] = [];
    fixture.componentInstance.changed.subscribe((state) => emitted.push(state));

    buttons(element)[0].click();
    http
      .expectOne(`${API}/editorial/initiatives/${ID}/transitions`)
      .flush({ message: 'Nadie revisa, aprueba ni publica un contenido del que es autor.' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Nadie revisa, aprueba ni publica');
    expect(emitted).toEqual([]);
  });

  it('rechazar se ofrece con su nombre, aunque en el modelo sea archivar desde la revisión', async () => {
    const element = await render('IN_REVIEW', [{ to: 'ARCHIVED', requiresComment: true }]);
    expect(buttonTexts(element)).toEqual(['Rechazar']);
  });

  it('muestra el historial con quién hizo cada paso y su observación', async () => {
    const element = await render('RETURNED', [], [
      { from: 'DRAFT', to: 'SUBMITTED', actorName: 'Andrea Autora', comment: null, createdAt: '2026-10-01T15:00:00Z' },
      { from: 'IN_REVIEW', to: 'RETURNED', actorName: 'Ramiro Revisor', comment: 'Falta el territorio.', createdAt: '2026-10-02T15:00:00Z' },
    ]);

    const entries = [...element.querySelectorAll('ol li')].map((li) => li.textContent);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toContain('Ramiro Revisor');
    expect(entries[1]).toContain('Devuelto con observaciones');
    expect(entries[1]).toContain('Falta el territorio.');
  });
});
