// =============================================================
// MULTI-TENANCY
// =============================================================

export interface Organization {
  id: string
  name: string
  slug?: string
  logo_url?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  rnc?: string
  plan: string
  plan_expires_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  price_dop?: number
  price_usd?: number
  properties_limit: number
  users_limit: number
  features: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================
// ENUMS
// =============================================================

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'gerente_operativo'
  | 'equipo_cobros'
  | 'equipo_legal'
  | 'equipo_mantenimiento'
  | 'contabilidad'
  | 'solo_lectura'
  | 'inquilino'
  | 'propietario'

export type PropertyStatus = 'disponible' | 'ocupada' | 'en_mantenimiento' | 'proceso_legal' | 'inactiva'
export type PropertyType = 'apartamento' | 'casa' | 'local_comercial' | 'oficina' | 'villa' | 'penthouse' | 'estudio' | 'otro'
export type TenantStatus = 'activo' | 'en_observacion' | 'moroso' | 'en_legal' | 'desalojado' | 'historico'
export type LeaseStatus = 'activo' | 'por_vencer' | 'vencido' | 'renovado' | 'terminado' | 'cancelado'
export type PaymentStatus = 'al_dia' | 'vence_pronto' | 'vencido' | 'en_mora' | 'en_legal' | 'cubierto_garantia' | 'pagado'
export type Currency = 'DOP' | 'USD'
export type GuaranteeStatus = 'activa' | 'inactiva' | 'reclamada' | 'recuperada' | 'perdida'
export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico'
export type TaskPriority = 'baja' | 'media' | 'alta' | 'urgente'
export type TaskStatus = 'pendiente' | 'en_proceso' | 'completada' | 'cancelada' | 'vencida'
export type DocumentType = 'contrato' | 'cedula' | 'pasaporte' | 'comprobante_pago' | 'inventario' | 'carta' | 'acta' | 'foto' | 'factura' | 'documento_legal' | 'cotizacion' | 'otro'
export type DocumentVisibility = 'admin_only' | 'propietario' | 'inquilino' | 'ambos'
export type CommunicationChannel = 'whatsapp' | 'email' | 'llamada' | 'nota_interna' | 'sms'
export type LegalStatus = 'prelegal' | 'en_legal' | 'desalojo' | 'cerrado' | 'recuperado'
export type MaintenanceStatus = 'pendiente' | 'revisando' | 'cotizado' | 'aprobado' | 'en_proceso' | 'completado' | 'rechazado'
export type MaintenancePayer = 'propietario' | 'inquilino' | 'puntualpago'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  last_login?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface Owner {
  id: string
  user_id?: string
  full_name: string
  legal_name?: string
  is_company: boolean
  cedula?: string
  rnc?: string
  email?: string
  phone?: string
  phone_alt?: string
  whatsapp?: string
  address?: string
  sector?: string
  city: string
  bank_name?: string
  bank_account?: string
  bank_account_type?: string
  payment_preference?: string
  relationship_level: string
  sensitivity_notes?: string
  is_active: boolean
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // computed
  properties?: Property[]
}

export interface Building {
  id: string
  name: string
  code?: string
  address?: string
  sector?: string
  city: string
  province: string
  total_units: number
  monthly_maintenance_amount: number
  currency: Currency
  notes?: string
  is_active: boolean
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // computed/joined
  properties?: Property[]
  occupied_units?: number
  maintenance_per_unit?: number
}

export interface Property {
  id: string
  code?: string
  name: string
  type: PropertyType
  status: PropertyStatus
  address: string
  sector?: string
  city: string
  province: string
  rent_amount: number
  currency: Currency
  deposit_amount?: number
  payment_day: number
  has_guarantee: boolean
  owner_id?: string
  building_id?: string
  maintenance_fee: number
  maintenance_fee_override: boolean
  description?: string
  notes?: string
  is_active: boolean
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  owner?: Owner
  building?: Building
  current_lease?: Lease
  current_tenant?: Tenant
}

export interface OwnerPayout {
  id: string
  owner_id: string
  property_id: string
  period_year: number
  period_month: number
  rent_collected: number
  management_fee: number
  fee_percentage?: number
  maintenance_deductions: number
  other_deductions: number
  net_payout: number
  currency: Currency
  paid: boolean
  paid_date?: string
  payment_reference?: string
  payment_method?: string
  covered_by_guarantee: boolean
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  owner?: Owner
  property?: Property
}

export interface Tenant {
  id: string
  user_id?: string
  full_name: string
  id_type: string
  id_number?: string
  nationality: string
  email?: string
  phone?: string
  phone_alt?: string
  whatsapp?: string
  occupation?: string
  employer?: string
  estimated_income?: number
  income_currency: Currency
  status: TenantStatus
  risk_level: RiskLevel
  pending_balance: number
  current_address?: string
  reference_1_name?: string
  reference_1_phone?: string
  reference_2_name?: string
  reference_2_phone?: string
  notes?: string
  is_active: boolean
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Lease {
  id: string
  contract_number?: string
  property_id: string
  tenant_id: string
  owner_id: string
  start_date: string
  end_date: string
  rent_amount: number
  currency: Currency
  deposit_amount?: number
  late_fee_percentage: number
  late_fee_grace_days: number
  payment_day: number
  status: LeaseStatus
  has_guarantee: boolean
  guarantee_id?: string
  signed_date?: string
  signing_status: string
  special_conditions?: string
  inventory_included: boolean
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  property?: Property
  tenant?: Tenant
  owner?: Owner
}

export interface Payment {
  id: string
  payment_number?: string
  lease_id: string
  property_id: string
  tenant_id: string
  owner_id: string
  period_year: number
  period_month: number
  due_date: string
  rent_amount: number
  currency: Currency
  late_fee: number
  discount: number
  total_due: number
  amount_paid: number
  balance_due: number
  status: PaymentStatus
  days_overdue: number
  covered_by_guarantee: boolean
  guarantee_id?: string
  paid_date?: string
  payment_method?: string
  payment_reference?: string
  sent_to_legal: boolean
  notes?: string
  organization_id?: string
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  // joined
  property?: Property
  tenant?: Tenant
  owner?: Owner
  lease?: Lease
}

export interface Guarantee {
  id: string
  lease_id: string
  property_id: string
  tenant_id: string
  owner_id: string
  status: GuaranteeStatus
  start_date: string
  end_date?: string
  guaranteed_amount: number
  currency: Currency
  total_exposure: number
  total_recovered: number
  payout_deadline_days: number
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  property?: Property
  tenant?: Tenant
  owner?: Owner
  lease?: Lease
}

export interface GuaranteeClaim {
  id: string
  guarantee_id: string
  payment_id: string
  claim_date: string
  amount_claimed: number
  currency: Currency
  payout_date?: string
  payout_amount?: number
  payout_reference?: string
  owner_paid: boolean
  recovery_amount: number
  recovery_date?: string
  fully_recovered: boolean
  status: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  created_by?: string
  priority: TaskPriority
  status: TaskStatus
  due_date?: string
  completed_at?: string
  entity_type?: string
  entity_id?: string
  property_id?: string
  owner_id?: string
  tenant_id?: string
  lease_id?: string
  payment_id?: string
  organization_id?: string
  created_at: string
  updated_at: string
  // joined
  assignee?: User
}

export interface Document {
  id: string
  type: DocumentType
  property_id?: string
  owner_id?: string
  tenant_id?: string
  lease_id?: string
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  is_private: boolean
  visibility: DocumentVisibility
  description?: string
  organization_id?: string
  uploaded_by?: string
  created_at: string
  // joined
  property?: Property
  tenant?: Tenant
  owner?: Owner
  uploader?: User
}

export interface Note {
  id: string
  content: string
  property_id?: string
  owner_id?: string
  tenant_id?: string
  lease_id?: string
  payment_id?: string
  visibility: DocumentVisibility
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  author?: User
  property?: Property
}

export interface PropertyEvent {
  id: string
  property_id: string
  event_type: string
  title: string
  description?: string
  visibility: DocumentVisibility
  icon?: string
  color?: string
  metadata?: Record<string, unknown>
  created_by?: string
  organization_id?: string
  created_at: string
  // joined
  author?: User
  property?: Property
}

export interface LegalCase {
  id: string
  case_number?: string
  property_id: string
  tenant_id: string
  owner_id: string
  lease_id?: string
  status: LegalStatus
  reason: string
  amount_owed: number
  currency: Currency
  days_in_arrears?: number
  lawyer_assigned?: string
  internal_assigned?: string
  opened_date: string
  next_action_date?: string
  next_action?: string
  closed_date?: string
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joined
  property?: Property
  tenant?: Tenant
}

export interface MaintenanceRequest {
  id: string
  ticket_number?: string
  property_id: string
  tenant_id?: string
  title: string
  description?: string
  priority: TaskPriority
  status: MaintenanceStatus
  estimated_cost?: number
  actual_cost?: number
  currency: Currency
  paid_by?: MaintenancePayer
  provider_name?: string
  provider_phone?: string
  assigned_to?: string
  reported_date: string
  scheduled_date?: string
  completed_date?: string
  notes?: string
  organization_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface RiskScore {
  id: string
  entity_type: string
  entity_id: string
  score: number
  level: RiskLevel
  payment_history_score: number
  days_overdue_score: number
  recurrence_score: number
  income_score: number
  documents_score: number
  references_score: number
  recommended_action?: string
  organization_id?: string
  calculated_at: string
}

export interface DashboardStats {
  active_properties: number
  total_properties: number
  monthly_rent_managed: number
  paid_this_month: number
  overdue_count: number
  total_arrears: number
  covered_by_guarantee: number
  leases_expiring_90d: number
  leases_expiring_30d: number
  open_legal_cases: number
  open_maintenance: number
  overdue_tasks: number
  pending_owner_payouts: number
  calculated_at: string
}

export interface Communication {
  id: string
  channel: CommunicationChannel
  direction: 'inbound' | 'outbound'
  subject?: string
  content: string
  template_used?: string
  tenant_id?: string
  owner_id?: string
  property_id?: string
  payment_id?: string
  sent_at?: string
  delivered?: boolean
  read_at?: string
  organization_id?: string
  created_by?: string
  created_at: string
  // joined
  tenant?: Tenant
  owner?: Owner
  property?: Property
}

export interface AuditLog {
  id: string
  user_id?: string
  user_email?: string
  user_role?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  organization_id?: string
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  entity_type?: string
  entity_id?: string
  read: boolean
  read_at?: string
  organization_id?: string
  created_at: string
}

export interface Settings {
  id: string
  key: string
  value: unknown
  description?: string
  organization_id?: string
  updated_by?: string
  updated_at: string
}
