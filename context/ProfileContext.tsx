import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';

type Profile = {
  id?: string;
  nombre?: string;
  correo?: string;
  telefono?: string | null;
  numero_casa?: string | null;
  foto_url?: string | null;       // URL firmada actual (backend)
  avatar_version?: number;        // opcional: si decides guardarlo en DB
  updated_at?: string;
};

type Ctx = {
  loading: boolean;
  profile: Profile | null;
  avatarUrl: string | null;                    // URL con ?v= para romper caché
  refreshProfile: () => Promise<void>;         // refetch del perfil
  notifyAvatarUpdated: () => Promise<void>;    // llamar tras cambiar foto
  clearProfile: () => void;                     // limpiar perfil (logout)
};

const ProfileContext = createContext<Ctx | null>(null);

function withVersion(url: string | null, version: number) {
  if (!url) return null;
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;
}

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localAvatarVersion, setLocalAvatarVersion] = useState(0);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('No userId in storage');
      const res = await fetch(`${AUTH_BASE_URL}/${userId}`);
      const txt = await res.text();
      const data: Profile = JSON.parse(txt);
      setProfile(data);
    } catch (e) {
      console.log('[ProfileProvider] fetchProfile error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const avatarUrl = useMemo(() => {
    const base = profile?.foto_url ?? null;
    const v = (profile?.avatar_version ?? 0) + localAvatarVersion;
    return withVersion(base, v);
  }, [profile?.foto_url, profile?.avatar_version, localAvatarVersion]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const notifyAvatarUpdated = useCallback(async () => {
    // 1) Refetch para agarrar nueva signed URL desde backend
    await fetchProfile();
    // 2) Bump local para invalidar caché inmediatamente en toda la app
    setLocalAvatarVersion((x) => x + 1);
  }, [fetchProfile]);

  const clearProfile = () => {
    setProfile(null);
    setLocalAvatarVersion(0);
  }

  const value: Ctx = {
    loading,
    profile,
    avatarUrl,
    refreshProfile,
    notifyAvatarUpdated,
    clearProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
