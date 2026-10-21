import { Pipe, PipeTransform } from '@angular/core';
import { LinkStatus, TaxonomyType } from '../core/models';

/** Textos en lenguaje ciudadano para los codigos (enumeraciones del modelo) que devuelve la API. */
const LABELS: Record<string, string> = {
  // EditorialStatus
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado a revisión',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  PUBLISHED: 'Publicado',
  RETURNED: 'Devuelto con observaciones',
  ARCHIVED: 'Archivado',
  // InitiativeType
  PROJECT: 'Proyecto',
  PROGRAM: 'Programa',
  RESEARCH: 'Investigación',
  EXTENSION: 'Extensión',
  TRAINING_PRACTICE: 'Práctica formativa',
  COMMUNITY_EXPERIENCE: 'Experiencia comunitaria',
  // CourseType y CourseModality
  COURSE: 'Curso',
  MICROCOURSE: 'Microcurso',
  DIPLOMA: 'Diplomado',
  VIRTUAL: 'Virtual',
  IN_PERSON: 'Presencial',
  HYBRID: 'Híbrida',
  SELF_PACED: 'Autoformación',
  // Visibility
  PUBLIC: 'Acceso abierto',
  RESTRICTED: 'Acceso con sesión',
  // UserStatus
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  SUSPENDED: 'Suspendida',
  // RoleName
  VISITOR: 'Visitante',
  REGISTERED: 'Usuario registrado',
  AUTHOR: 'Autor',
  REVIEWER: 'Revisor',
  ACADEMIC_MANAGER: 'Gestor académico',
  FUNCTIONAL_ADMIN: 'Administrador funcional',
  TECHNICAL_ADMIN: 'Administrador técnico',
  STUDENT: 'Estudiante',
  // Entidades publicables
  initiatives: 'Iniciativa',
  resources: 'Recurso',
  courses: 'Curso',
};

const TAXONOMY: Record<TaxonomyType, string> = {
  THEME: 'Temas',
  TERRITORY: 'Territorios',
  POPULATION: 'Poblaciones',
  RESOURCE_TYPE: 'Tipos de recurso',
  TAG: 'Etiquetas',
};

/** Verbo de la accion que lleva a cada estado, para los botones del flujo editorial. */
const ACTIONS: Record<string, string> = {
  SUBMITTED: 'Enviar a revisión',
  IN_REVIEW: 'Tomar en revisión',
  RETURNED: 'Devolver con observaciones',
  APPROVED: 'Aprobar',
  PUBLISHED: 'Publicar',
  ARCHIVED: 'Archivar',
  DRAFT: 'Reactivar como borrador',
};

const LINK_STATUS: Record<LinkStatus, string> = {
  NOT_LINKED: 'Sin enlace con Moodle',
  PENDING: 'Pendiente: Moodle no respondió al verificar',
  VERIFIED: 'Verificado con Moodle',
  ERROR: 'Con error',
  ORPHAN: 'Huérfano: el aula ya no existe en Moodle',
};

const LINK_ERRORS: Record<string, string> = {
  curso_no_encontrado: 'No existe en Moodle un curso con ese idnumber.',
  idnumber_duplicado: 'En Moodle hay varios cursos con ese idnumber; debe ser único.',
  lms_inalcanzable: 'Moodle no respondió. Intenta verificar de nuevo más tarde.',
  token_invalido: 'Moodle rechazó la credencial de la plataforma. Avisa al administrador técnico.',
  respuesta_invalida: 'Moodle respondió con un formato inesperado. Avisa al administrador técnico.',
};

export const label = (code: string | null | undefined): string => (code ? (LABELS[code] ?? code) : '');
export const taxonomyLabel = (type: TaxonomyType): string => TAXONOMY[type];
/** Rechazar es archivar desde la revision: el boton lo dice con el verbo que entiende el revisor. */
export const actionLabel = (state: string, from?: string): string =>
  state === 'ARCHIVED' && from === 'IN_REVIEW' ? 'Rechazar' : (ACTIONS[state] ?? state);
export const linkStatusLabel = (status: LinkStatus): string => LINK_STATUS[status];
export const linkErrorLabel = (error: string | null): string => (error ? (LINK_ERRORS[error] ?? error) : '');

/** Tamano de archivo legible: 1,2 MB. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform = label;
}

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform = fileSize;
}
