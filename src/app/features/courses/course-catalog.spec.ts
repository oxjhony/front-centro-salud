import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api';
import { Catalogs, Page, PublicCourse } from '../../core/models';
import { CourseCatalog } from './course-catalog';

const API = 'http://api.prueba';

const CATALOGS: Catalogs = {
  terms: [
    { id: 't-1', name: 'Atención primaria en salud', type: 'THEME', parentId: null, active: true },
    { id: 'p-1', name: 'Líderes comunitarios', type: 'POPULATION', parentId: null, active: true },
  ],
  taxonomyTypes: ['THEME', 'TERRITORY', 'POPULATION', 'RESOURCE_TYPE', 'TAG'],
  editorialStatuses: [],
  initiativeTypes: [],
  courseTypes: ['COURSE', 'DIPLOMA'],
  courseModalities: ['VIRTUAL', 'IN_PERSON'],
  visibilities: ['PUBLIC', 'RESTRICTED'],
  resourceFormats: ['pdf'],
  maxUploadBytes: 1024,
};

const course = (overrides: Partial<PublicCourse>): PublicCourse => ({
  id: 'c-1',
  title: 'Curso básico de salud',
  summary: 'Introducción a la atención primaria.',
  type: 'COURSE',
  modality: 'VIRTUAL',
  duration: '40 horas',
  startDate: null,
  endDate: null,
  capacity: null,
  requirements: null,
  terms: [{ id: 't-1', name: 'Atención primaria en salud', type: 'THEME' }],
  access: { kind: 'LMS', url: 'http://127.0.0.1:8090/course/view.php?id=2' },
  initiatives: [],
  resources: [],
  publishedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const page = (items: PublicCourse[]): Page<PublicCourse> => ({ items, total: items.length, page: 1, pageSize: 12 });

/** Recorrido R3 "Encontrar formacion". */
describe('CourseCatalog', () => {
  let fixture: ComponentFixture<CourseCatalog>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: API }],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const render = async (courses: PublicCourse[]) => {
    fixture = TestBed.createComponent(CourseCatalog);
    fixture.detectChanges();
    http.expectOne(`${API}/catalogs`).flush(CATALOGS);
    http.expectOne((request) => request.url === `${API}/public/courses`).flush(page(courses));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('lista los cursos con su tipo, modalidad y clasificación en lenguaje ciudadano', async () => {
    const element = await render([course({})]);

    const card = element.querySelector('.card');
    expect(card?.querySelector('h2')?.textContent).toContain('Curso básico de salud');
    expect(card?.querySelector('.meta')?.textContent).toContain('Curso');
    expect(card?.querySelector('.meta')?.textContent).toContain('Virtual');
    expect(card?.querySelector('.tags')?.textContent).toContain('Atención primaria en salud');
  });

  it('la tarjeta ofrece el enlace al aula; la instrucción de acceso queda para la ficha del curso', async () => {
    const element = await render([
      course({}),
      course({ id: 'c-2', title: 'Diplomado territorial', access: { kind: 'INSTRUCTIONS', text: 'Escribe a la coordinación.' } }),
    ]);

    const [linked, instructed] = [...element.querySelectorAll('.card')];
    expect(linked.querySelector('a.button')?.getAttribute('href')).toBe('http://127.0.0.1:8090/course/view.php?id=2');
    expect(instructed.querySelector('a.button')).toBeNull();
    expect(instructed.textContent).not.toContain('Escribe a la coordinación.');
  });

  it('sin resultados explica por qué y qué hacer, en lugar de una página en blanco', async () => {
    const element = await render([]);

    expect(element.querySelectorAll('.card')).toHaveLength(0);
    expect(element.textContent).toContain('No hay cursos con esos criterios');
    expect(element.textContent).toContain('Limpiar');
  });

  it('cada filtro tiene su etiqueta asociada y los catálogos vienen de la taxonomía', async () => {
    const element = await render([]);

    for (const control of element.querySelectorAll('form input, form select')) {
      expect(element.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
    expect([...element.querySelectorAll('#modalidad option')].map((o) => o.textContent?.trim())).toEqual(['Todas', 'Virtual', 'Presencial']);
    expect([...element.querySelectorAll('#poblacion option')].map((o) => o.textContent?.trim())).toEqual([
      'Todas las personas',
      'Líderes comunitarios',
    ]);
  });

  it('si la API no responde lo informa', async () => {
    fixture = TestBed.createComponent(CourseCatalog);
    fixture.detectChanges();
    http.expectOne(`${API}/catalogs`).flush(CATALOGS);
    http.expectOne((request) => request.url === `${API}/public/courses`).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No fue posible conectar');
  });
});
