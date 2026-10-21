/**
 * Contratos de la API del backend. Reflejan las respuestas de back-centro-salud, que a su vez
 * siguen el modelo de datos v3 (documentos/centro_virtual_salud_publica_modelo_datosV3.json).
 */

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Taxonomia ---------------------------------------------------------------------------------

export type TaxonomyType = 'THEME' | 'TERRITORY' | 'POPULATION' | 'RESOURCE_TYPE' | 'TAG';

export interface TermRef {
  id: string;
  name: string;
  type: TaxonomyType;
}

export interface Term extends TermRef {
  parentId: string | null;
  active: boolean;
}

export interface TermAdmin extends Term {
  usage: number;
  children: number;
  updatedAt: string;
}

export interface Catalogs {
  terms: Term[];
  taxonomyTypes: TaxonomyType[];
  editorialStatuses: string[];
  initiativeTypes: string[];
  courseTypes: string[];
  courseModalities: string[];
  visibilities: Visibility[];
  resourceFormats: string[];
  maxUploadBytes: number;
}

// --- Contenidos --------------------------------------------------------------------------------

/** Otro contenido asociado, con su estado editorial (vista interna). */
export interface RelatedContent {
  id: string;
  title: string;
  state: string;
}

/** Contenido asociado tal como lo ve el visitante. */
export interface PublicRef {
  id: string;
  title: string;
}

export interface InitiativeSummary {
  id: string;
  title: string;
  summary: string;
  type: string;
  state: string;
  terms: TermRef[];
  publishedAt: string | null;
  updatedAt: string;
}

export interface InitiativeDetail extends InitiativeSummary {
  startDate: string | null;
  endDate: string | null;
  results: string | null;
  authors: { id: string; displayName: string }[];
  resources: RelatedContent[];
  courses: RelatedContent[];
}

export interface PublicInitiative {
  id: string;
  title: string;
  summary: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  results: string | null;
  terms: TermRef[];
  authors: string[];
  resources: PublicRef[];
  courses: PublicRef[];
  publishedAt: string | null;
}

export interface InitiativeInput {
  title: string;
  summary: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  results: string | null;
  termIds: string[];
  resourceIds: string[];
}

export type Visibility = 'PUBLIC' | 'RESTRICTED';

export interface VersionInfo {
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ResourceSummary {
  id: string;
  title: string;
  description: string;
  license: string;
  visibility: Visibility;
  state: string;
  terms: TermRef[];
  ownerName: string;
  latestVersion: VersionInfo | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ResourceDetail extends ResourceSummary {
  versions: VersionInfo[];
  initiatives: RelatedContent[];
  courses: RelatedContent[];
}

export interface PublicFile {
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface PublicResourceSummary {
  id: string;
  title: string;
  description: string;
  license: string;
  visibility: Visibility;
  terms: TermRef[];
  author: string;
  file: PublicFile | null;
  publishedAt: string | null;
}

export interface PublicResource extends PublicResourceSummary {
  initiatives: PublicRef[];
  courses: PublicRef[];
}

export interface ResourceInput {
  title: string;
  description: string;
  license: string;
  visibility: Visibility;
  termIds: string[];
}

/** Lo que el visitante puede hacer para entrar al curso (RF-06). */
export type CourseAccess = { kind: 'LMS'; url: string } | { kind: 'INSTRUCTIONS'; text: string } | { kind: 'UNAVAILABLE' };

export type LinkStatus = 'NOT_LINKED' | 'PENDING' | 'VERIFIED' | 'ERROR' | 'ORPHAN';

export interface LmsLink {
  externalId: string | null;
  url: string | null;
  status: LinkStatus;
  verifiedAt: string | null;
  error: string | null;
}

export interface CourseSummary {
  id: string;
  title: string;
  summary: string;
  type: string;
  modality: string;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  state: string;
  terms: TermRef[];
  link: LmsLink;
  publishedAt: string | null;
  updatedAt: string;
}

export interface CourseDetail extends CourseSummary {
  capacity: number | null;
  requirements: string | null;
  accessInstructions: string | null;
  initiatives: RelatedContent[];
  resources: RelatedContent[];
}

export interface PublicCourse {
  id: string;
  title: string;
  summary: string;
  type: string;
  modality: string;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  requirements: string | null;
  terms: TermRef[];
  access: CourseAccess;
  initiatives: PublicRef[];
  resources: PublicRef[];
  publishedAt: string | null;
}

export interface CourseInput {
  title: string;
  summary: string;
  type: string;
  modality: string;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  requirements: string | null;
  moodleExternalId: string | null;
  accessInstructions: string | null;
  termIds: string[];
  initiativeIds: string[];
  resourceIds: string[];
}

export type SearchableType = 'initiatives' | 'resources' | 'courses';

export interface SearchHit {
  type: SearchableType;
  id: string;
  title: string;
  excerpt: string;
  terms: TermRef[];
  publishedAt: string;
}

// --- Flujo editorial ---------------------------------------------------------------------------

export type PublishableEntity = 'initiatives' | 'resources' | 'courses';

export interface QueueItem {
  entityType: PublishableEntity;
  id: string;
  title: string;
  state: string;
  authorName: string;
  since: string;
}

export interface ReviewEntry {
  from: string;
  to: string;
  actorName: string;
  comment: string | null;
  createdAt: string;
}

export interface AvailableTransition {
  to: string;
  requiresComment: boolean;
}

// --- Cuenta ------------------------------------------------------------------------------------

export interface Profile {
  email: string;
  displayName: string;
  affiliation: string | null;
  generalTerritory: string | null;
  interests: string[];
  notificationOptIn: boolean;
  updatedAt: string;
}

export type ProfileInput = Omit<Profile, 'email' | 'updatedAt'>;

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

// --- Administracion ----------------------------------------------------------------------------

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RoleSummary {
  name: string;
  description: string;
  assignable: boolean;
  permissions: string[];
}

export interface AuditRecord {
  id: string;
  actorName: string | null;
  action: string;
  objectType: string | null;
  objectId: string | null;
  occurredAt: string;
  source: string;
  minimalDetail: Record<string, unknown> | null;
}

export interface IntegrationLogRecord {
  id: string;
  integration: string;
  operation: string;
  status: string;
  errorCode: string | null;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  durationMs: number | null;
  occurredAt: string;
}

export interface ReconciliationSummary {
  correlationId: string;
  reviewed: number;
  verified: number;
  orphaned: number;
  withError: number;
  unanswered: number;
}

/** Codigos de la tabla `permissions` del backend (capacidades al estilo de Moodle). */
export const Permission = {
  InitiativeManage: 'initiative:manage',
  ResourceManage: 'resource:manage',
  CourseManage: 'course:manage',
  ContentReview: 'content:review',
  UserManage: 'user:manage',
  TaxonomyManage: 'taxonomy:manage',
  AuditView: 'audit:view',
  IntegrationOperate: 'integration:operate',
  StudyGuide: 'study:guide',
} as const;

// --- Guia de estudio con IA ---------------------------------------------------------------------

/** Preguntar, explicar un fragmento o practicar con preguntas de repaso. */
export type GuideMode = 'ask' | 'explain' | 'quiz';

export interface GuideSource {
  type: SearchableType;
  id: string;
  title: string;
  excerpt: string;
}

export interface GuideAnswer {
  mode: GuideMode;
  answer: string;
  /** true si la redacto el modelo de lenguaje; false si son extractos del material. */
  generated: boolean;
  sources: GuideSource[];
}

/** Permisos que dan acceso al panel de administracion (basta uno). */
export const ADMIN_PERMISSIONS: string[] = [
  Permission.UserManage,
  Permission.TaxonomyManage,
  Permission.AuditView,
  Permission.IntegrationOperate,
];
