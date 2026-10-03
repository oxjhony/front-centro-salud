import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseAccess } from '../../core/models';
import { CourseAccessView } from './course-access';

/** RF-06: el visitante abre el curso correcto en Moodle o recibe una instruccion de acceso. */
describe('CourseAccessView', () => {
  let fixture: ComponentFixture<CourseAccessView>;

  const render = async (access: CourseAccess): Promise<HTMLElement> => {
    fixture = TestBed.createComponent(CourseAccessView);
    fixture.componentRef.setInput('access', access);
    fixture.componentRef.setInput('courseTitle', 'Primeros auxilios');
    await fixture.whenStable();
    return fixture.nativeElement;
  };

  it('con enlace verificado muestra el enlace al aula de Moodle', async () => {
    const element = await render({ kind: 'LMS', url: 'http://127.0.0.1:8090/course/view.php?id=3' });

    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe('http://127.0.0.1:8090/course/view.php?id=3');
    expect(link?.textContent).toContain('Ir al aula virtual');
    // El nombre accesible distingue un enlace de otro cuando hay varios cursos en la pagina.
    expect(link?.textContent).toContain('Primeros auxilios');
  });

  it('sin enlace verificado muestra la instrucción de acceso y ningún enlace', async () => {
    const element = await render({ kind: 'INSTRUCTIONS', text: 'Inscripción presencial en la sede.' });

    expect(element.textContent).toContain('Cómo ingresar');
    expect(element.textContent).toContain('Inscripción presencial en la sede.');
    expect(element.querySelector('a')).toBeNull();
  });

  it('sin enlace ni instrucción lo dice con texto, no deja el espacio vacío', async () => {
    const element = await render({ kind: 'UNAVAILABLE' });

    expect(element.textContent).toContain('todavía no está disponible');
    expect(element.querySelector('a')).toBeNull();
  });

  it('no convierte en enlace una dirección peligrosa', async () => {
    const element = await render({ kind: 'LMS', url: 'javascript:alert(1)' });

    expect(element.querySelector('a')?.getAttribute('href')).toBe('unsafe:javascript:alert(1)');
  });
});
