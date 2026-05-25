import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { PropsWithChildren, createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { AttendanceCheckInPayload, AttendanceCheckOutPayload, checkIn as apiCheckIn, checkOut as apiCheckOut, fetchAttendanceList, login as loginRequest, logout as logoutRequest, register as registerRequest, validateToken } from '@/lib/api';
import { ApiError, Attendance, AttendanceMutationResponse, LoginSuccessResponse, PaginatedResponse, RegisterPayload, RegisterSuccessResponse, User } from '@/types/api';

type AuthContextValue = {
  user: User | null;
  roles: string[];
  permissions: string[];
  token: string | null;
  isBootstrapping: boolean;
  isAuthenticating: boolean;
  isRegistering: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginSuccessResponse>;
  register: (payload: RegisterPayload) => Promise<RegisterSuccessResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchAttendances: (page?: number, perPage?: number) => Promise<PaginatedResponse<Attendance>>;
  submitCheckIn: (payload: AttendanceCheckInPayload) => Promise<AttendanceMutationResponse>;
  submitCheckOut: (attendanceId: string, payload: AttendanceCheckOutPayload) => Promise<AttendanceMutationResponse>;
};

const TOKEN_STORAGE_KEY = '@presence/auth-token';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          return;
        }

        const { user: profile, roles: roleNames, permissions: abilityNames } = await validateToken(storedToken);
        setUser(profile);
        setRoles(roleNames);
        setPermissions(Array.isArray(abilityNames) ? abilityNames : []);
        setToken(storedToken);
      } catch (error) {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setRoles([]);
        setPermissions([]);
        setToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const response = await loginRequest(email, password);
      setUser(response.user);
      setRoles(response.roles ?? []);
      setPermissions(response.permissions ?? []);
      setToken(response.token);
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      return response;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsRegistering(true);
    try {
      return await registerRequest(payload);
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      throw new ApiError('Token tidak ditemukan', 401);
    }

    const { user: profile, roles: roleNames, permissions: abilityNames } = await validateToken(token);
    setUser(profile);
    setRoles(roleNames);
    setPermissions(Array.isArray(abilityNames) ? abilityNames : []);
  }, [token]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await logoutRequest(token);
      }
    } catch (error) {
      // Best effort logout; ignore API errors and continue clearing state.
    } finally {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setRoles([]);
      setPermissions([]);
    }
  }, [token]);

  const fetchAttendancesWrapped = useCallback(
    async (page = 1, perPage = 20) => {
      if (!token) {
        throw new ApiError('Token tidak ditemukan', 401);
      }

      return fetchAttendanceList(token, page, perPage);
    },
    [token],
  );

  const submitCheckIn = useCallback(async (payload: AttendanceCheckInPayload) => {
    if (!token) {
      throw new ApiError('Token tidak ditemukan', 401);
    }

    if (__DEV__) {
      console.info('[attendance] submitCheckIn called', {
        store_id: payload.store_id,
        shift_store_id: payload.shift_store_id,
        hasToken: Boolean(token),
        hasPhoto: Boolean(payload.photo),
      });
    }

    return apiCheckIn(token, payload);
  }, [token]);

  const submitCheckOut = useCallback(async (attendanceId: string, payload: AttendanceCheckOutPayload) => {
    if (!token) {
      throw new ApiError('Token tidak ditemukan', 401);
    }

    return apiCheckOut(token, attendanceId, payload);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      permissions,
      token,
      isBootstrapping,
      isAuthenticating,
      isRegistering,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshUser,
      fetchAttendances: fetchAttendancesWrapped,
      submitCheckIn,
      submitCheckOut,
    }),
    [user, roles, permissions, token, isBootstrapping, isAuthenticating, isRegistering, login, register, logout, refreshUser, fetchAttendancesWrapped, submitCheckIn, submitCheckOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
