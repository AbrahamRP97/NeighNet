import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_BASE_URL } from '../api';
import { registerAndSyncPushToken } from '../utils/pushNotifications';

type Profile = {
  id?: string;
  nombre?: string;
  correo?: string;
  telefono?: string | null;
  numero_casa?: string | null;
  foto_url?: string | null;
  avatar_version?: number;
  updated_at?: string;
};

type Ctx = {
  loading: boolean;
  profile: Profile | null;
  avatarUrl: string | null;
  refreshProfile: () => Promise<void>;
  notifyAvatarUpdated: () => Promise<void>;
  clearProfile: () => void;
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
  const [pushSynced, setPushSynced] = useState(false); // 👈 AÑADIDO

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setProfile(null);
        return;
      }

      const url = `${AUTH_BASE_URL}/me`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const txt = await res.text();
      let data: Profile = {} as any;
      try {
        data = txt ? JSON.parse(txt) : ({} as any);
      } catch (e) {
        console.log('[ProfileProvider] JSON parse error:', e);
      }

      if (!res.ok) {
        console.log('[ProfileProvider] fetchProfile error status:', res.status, data);

        if (res.status === 401 || res.status === 403) {
          await AsyncStorage.clear();
          setProfile(null);
          return;
        }

        setProfile(null);
        return;
      }

      if (!data?.id) {
        console.log('[ProfileProvider] Respuesta sin id. Data:', data);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (e) {
      console.log('[ProfileProvider] fetchProfile error:', e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    (async () => {
      try {
        if (!profile?.id || pushSynced) return;
        const ok = await registerAndSyncPushToken();
        if (ok) setPushSynced(true);
      } catch {
        // Ignorar errores de push
      }
    })();
  }, [profile?.id, pushSynced]);

  const avatarUrl = useMemo(() => {
    const base = profile?.foto_url ?? null;
    const v = (profile?.avatar_version ?? 0) + localAvatarVersion;
    return withVersion(base, v);
  }, [profile?.foto_url, profile?.avatar_version, localAvatarVersion]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const notifyAvatarUpdated = useCallback(async () => {
    await fetchProfile();
    setLocalAvatarVersion((x) => x + 1);
  }, [fetchProfile]);

  const clearProfile = () => {
    setProfile(null);
    setLocalAvatarVersion(0);
    setPushSynced(false);
  };

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
