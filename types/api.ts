export interface StoreSummary {
  id: string;
  name: string;
  nickname?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  radius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShiftStoreSummary {
  id: string;
  name: string;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  duration?: number | null;
}

export interface TenantSummary {
  id: string;
  name: string;
  users_count?: number;
  owner?: UserSummary | null;
  stores?: StoreSummary[];
  shift_stores?: ShiftStoreSummary[];
}

/**
 * Pilihan tenant yang dapat diakses user (dari login response `user.tenants`
 * atau `GET /tenants/accessible`). Dipakai untuk tenant selector multi-tenant.
 */
export interface TenantChoice {
  id: string;
  name: string;
  is_owner?: boolean;
  is_primary?: boolean;
  role?: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface RoleSummary {
  id: number | string;
  name: string;
  guard_name?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  tenant_id?: string | null;
  tenant?: TenantSummary | null;
  tenants?: TenantChoice[];
  roles?: RoleSummary[];
  role?: string;
  base_role?: string;
}

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
}

export type AttendanceStatus = 'pending' | 'approved' | 'rejected';

export interface Attendance {
  id: string;
  store_id: string;
  store?: StoreSummary | null;
  shift_store_id?: string | null;
  shift_store?: ShiftStoreSummary | null;
  status: AttendanceStatus;
  was_late?: boolean;
  was_early_leave?: boolean;
  image_in?: string | null;
  check_in?: string | null;
  location_in?: AttendanceLocation | null;
  image_out?: string | null;
  check_out?: string | null;
  location_out?: AttendanceLocation | null;
  auto_checked_out_at?: string | null;
  created_by?: UserSummary | null;
  created_by_id: string;
  approved_by?: UserSummary | null;
  approved_by_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  tenant_name: string;
}

export interface RegisterSuccessResponse {
  success: true;
  message: string;
  user: User;
  roles: string[];
}

export interface LoginSuccessResponse {
  success: true;
  message: string;
  user: User;
  roles: string[];
  permissions?: string[];
  token: string;
  token_type: string;
}

export interface ValidateTokenResponse {
  success: true;
  message: string;
  user: User;
  roles: string[];
  permissions: string[];
}

export interface AttendanceMutationResponse {
  success: true;
  message: string;
  attendance: Attendance;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
