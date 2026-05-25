import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  ApiError,
  ApiErrorResponse,
  Attendance,
  AttendanceMutationResponse,
  ShiftStoreSummary,
  StoreSummary,
  LoginSuccessResponse,
  PaginatedResponse,
  RegisterPayload,
  RegisterSuccessResponse,
  ValidateTokenResponse,
} from '@/types/api';

const DEFAULT_BASE_URL = 'http://localhost:8001/api';

const expoConfig = Constants?.expoConfig ?? Constants?.manifest;
const { EXPO_PUBLIC_API_BASE_URL: extraBaseUrl, apiUrl: extraApiUrl } =
  (expoConfig?.extra as { EXPO_PUBLIC_API_BASE_URL?: string; apiUrl?: string } | undefined) ?? {};

function resolveBaseUrl() {
  const configuredUrl = (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    extraBaseUrl ||
    extraApiUrl ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, '');

  const hostUri = (Constants as unknown as { expoConfig?: { hostUri?: string }; manifest?: { debuggerHost?: string } })
    ?.expoConfig?.hostUri ?? (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;
  const devHost = hostUri?.split(':')[0];

  if (Platform.OS !== 'web' && devHost && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api$/i.test(configuredUrl)) {
    return configuredUrl.replace(/\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api$/i, `//${devHost}:8001/api`);
  }

  return configuredUrl;
}

const baseUrl = resolveBaseUrl();

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any | FormData;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type UploadPhoto =
  | Blob
  | File
  | {
      uri: string;
      name: string;
      type: string;
    };

function isBlobPhoto(photo: UploadPhoto): photo is Blob {
  return typeof Blob !== 'undefined' && photo instanceof Blob;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers = {}, signal } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  let payload: BodyInit | undefined;

  if (body) {
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    } else {
      payload = body;
    }
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Add Active Tenant header if available (non-blocking)
  try {
    // Dynamically import AsyncStorage to avoid issues
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const activeTenantId = await AsyncStorage.getItem('active_tenant_id');
    if (activeTenantId) {
      requestHeaders['X-Active-Tenant'] = activeTenantId;
    }
  } catch (e) {
    // Silently fail if AsyncStorage not available
  }

  const url = `${baseUrl}${path}`;
  if (__DEV__) {
    console.info('[apiFetch] request', {
      method,
      path,
      url,
      hasToken: Boolean(token),
      hasBody: Boolean(body),
      isFormData,
      activeTenant: requestHeaders['X-Active-Tenant'] ?? null,
    });
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[apiFetch] network error', {
        method,
        path,
        url,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }

  const text = await response.text();
  let data: T | ApiErrorResponse | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T | ApiErrorResponse;
    } catch {
      data = {
        message: text,
      } as ApiErrorResponse;
    }
  }

  if (!response.ok) {
    const errorPayload = data as ApiErrorResponse | null;
    const firstError = errorPayload?.errors ? Object.values(errorPayload.errors)[0]?.[0] : undefined;
    const message = firstError ?? errorPayload?.message ?? `Permintaan gagal dengan status ${response.status}`;

    if (__DEV__) {
      console.warn('[apiFetch] request failed', {
        method,
        path,
        url,
        status: response.status,
        response: errorPayload,
      });
    }

    throw new ApiError(message, response.status, errorPayload?.errors);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<LoginSuccessResponse> {
  return apiFetch<LoginSuccessResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function validateToken(token: string): Promise<ValidateTokenResponse> {
  return apiFetch<ValidateTokenResponse>('/auth/validate-token', {
    method: 'GET',
    token,
  });
}

export async function logout(token: string): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function register(payload: RegisterPayload): Promise<RegisterSuccessResponse> {
  return apiFetch<RegisterSuccessResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchAttendanceList(token: string, page = 1, perPage = 20): Promise<PaginatedResponse<Attendance>> {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return apiFetch<PaginatedResponse<Attendance>>(`/attendance?${searchParams.toString()}`, {
    method: 'GET',
    token,
  });
}

export async function fetchStores(token: string): Promise<StoreSummary[]> {
  const response = await apiFetch<{ success: boolean; data: StoreSummary[] }>('/stores', {
    method: 'GET',
    token,
  });
  return response.data ?? [];
}

export async function fetchShiftStores(token: string, storeId?: string): Promise<ShiftStoreSummary[]> {
  const searchParams = new URLSearchParams();

  const response = await apiFetch<{
    success: boolean; data: Array<{
      id: string;
      name: string;
      shift_start_time?: string | null;
      shift_end_time?: string | null;
      duration?: number | null;
    }>
  }>('/shift-stores' + (searchParams.toString() ? `?${searchParams.toString()}` : ''), {
    method: 'GET',
    token,
  });

  return (response.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    shift_start_time: item.shift_start_time ?? null,
    shift_end_time: item.shift_end_time ?? null,
  }));
}

export interface AttendanceCheckInPayload {
  store_id: string;
  shift_store_id?: string | null;
  photo: UploadPhoto;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface AttendanceCheckOutPayload {
  store_id: string;
  photo?: UploadPhoto | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export async function checkIn(token: string, payload: AttendanceCheckInPayload): Promise<AttendanceMutationResponse> {
  const formData = new FormData();
  formData.append('store_id', payload.store_id);
  if (payload.shift_store_id) {
    formData.append('shift_store_id', payload.shift_store_id);
  }
  formData.append('photo', payload.photo as any);
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));
  if (payload.accuracy !== undefined) {
    formData.append('accuracy', String(payload.accuracy));
  }

  if (__DEV__) {
    const photo = payload.photo as UploadPhoto;
    console.info('[attendance] sending check-in', {
      store_id: payload.store_id,
      shift_store_id: payload.shift_store_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      photo: isBlobPhoto(photo)
        ? { kind: 'blob', type: photo.type, size: photo.size }
        : { kind: 'file-uri', uri: photo.uri, name: photo.name, type: photo.type },
    });
  }

  return apiFetch<AttendanceMutationResponse>('/attendance/checkin', {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function checkOut(token: string, attendanceId: string, payload: AttendanceCheckOutPayload): Promise<AttendanceMutationResponse> {
  const formData = new FormData();
  formData.append('attendance_id', attendanceId);
  formData.append('store_id', payload.store_id);
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));
  if (payload.accuracy !== undefined) {
    formData.append('accuracy', String(payload.accuracy));
  }
  if (payload.photo) {
    formData.append('photo', payload.photo as any);
  }

  return apiFetch<AttendanceMutationResponse>('/attendance/checkout', {
    method: 'POST',
    token,
    body: formData,
  });
}

export interface LeaveRequestPayload {
  start_date: string;
  end_date: string;
  leave_type: 'annual' | 'sick' | 'emergency';
  reason: string;
}

export interface LeaveRequestResponse {
  success: boolean;
  data: {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    reason: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  message: string;
}


export async function submitLeaveRequest(token: string, payload: LeaveRequestPayload): Promise<LeaveRequestResponse> {
  return apiFetch<LeaveRequestResponse>('/leave-requests', {
    method: 'POST',
    token,
    body: payload,
  });
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
  status: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export async function fetchLeaveRequests(token: string): Promise<{ success: boolean; data: LeaveRequest[] }> {
  const response = await apiFetch<{ success: boolean; data: { data: LeaveRequest[] } | LeaveRequest[] }>('/leave-requests', {
    method: 'GET',
    token,
  });

  // Handle Laravel pagination response
  const leaveRequests = Array.isArray(response.data)
    ? response.data
    : (response.data?.data || []);

  return {
    success: response.success,
    data: leaveRequests
  };
}
