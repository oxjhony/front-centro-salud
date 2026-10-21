import { Material, MaterialOrigin } from '../../core/models';

/** Icono según el tipo de material y, si no hay, según la actividad de Moodle. */
export function materialIcon(material: Pick<Material, 'materialType' | 'moduleType' | 'format'>): string {
  switch (material.materialType) {
    case 'Presentación':
      return 'presentation';
    case 'Tarea':
    case 'Taller':
      return 'clipboard-list';
    case 'Evaluación':
      return 'list-checks';
    case 'Foro':
      return 'messages-square';
    case 'Enlace externo':
      return 'link';
    case 'Lectura':
    case 'Guía':
      return 'book-open';
    case 'Programa del curso':
      return 'file-text';
  }
  switch (material.moduleType) {
    case 'forum':
      return 'messages-square';
    case 'assign':
      return 'clipboard-list';
    case 'url':
      return 'link';
    default:
      return material.format === 'pptx' ? 'presentation' : 'file-text';
  }
}

/** Cómo lo nombra Moodle: el tipo de actividad y el formato del archivo. */
export function moodleKind(material: Pick<Material, 'moduleType' | 'format'>): string {
  switch (material.moduleType) {
    case 'forum':
      return 'Foro';
    case 'assign':
      return 'Tarea';
    case 'url':
      return 'URL';
    case 'quiz':
      return 'Cuestionario';
    default:
      return material.format === 'pptx' ? 'Archivo PowerPoint' : material.format === 'pdf' ? 'Archivo PDF' : 'Archivo';
  }
}

export const ORIGIN_LABEL: Record<MaterialOrigin, string> = {
  regla: 'Regla',
  ia: 'IA',
  persona: 'Persona',
};

export const ORIGIN_ICON: Record<MaterialOrigin, string> = {
  regla: 'ruler',
  ia: 'sparkles',
  persona: 'user-check',
};

/** Confianza en tres niveles, para color y texto. */
export function confidenceLevel(value: number | null): 'alta' | 'media' | 'baja' {
  if (value === null) return 'baja';
  if (value >= 0.85) return 'alta';
  if (value >= 0.6) return 'media';
  return 'baja';
}
