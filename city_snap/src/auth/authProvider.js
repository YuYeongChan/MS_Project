// auth/AuthProvider.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import jwt_decode from 'jwt-decode';
import { getTokens, saveTokens, clearTokens } from './authStorage';

// 토큰 exp(초 단위) 체크 유틸
function isExpired(token) {
  try {
    const { exp } = jwt_decode(token);
    if (!exp) return false;
    return Date.now() / 1000 >= exp;
  } catch {
    return true;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState(null); // 토큰 payload 저장 (user_id, nickname, role 등)

  // 앱 시작 시 토큰 읽어 자동 로그인
  useEffect(() => {
    (async () => {
      try {
        const { access } = await getTokens();
        if (access && !isExpired(access)) {
          const payload = jwt_decode(access);
          setUser(payload);
        } else {
          // 만료/없음: 그대로 미로그인 상태 유지
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({
    bootstrapping,
    user,                        // null이면 비로그인, 있으면 로그인
    isSignedIn: !!user,
    // 로그인 성공 후(예: /account.sign.in) 토큰 저장 → user 갱신
    completeSignIn: async ({ access, refresh }) => {
      await saveTokens({ access, refresh });
      try {
        const payload = jwt_decode(access);
        setUser(payload);
      } catch {
        setUser(null);
      }
    },
    // (선택) 액세스 토큰이 서버에서 갱신돼 돌아왔을 때 반영용
    updateAccessOnly: async (access) => {
      const curr = await getTokens();
      await saveTokens({ access, refresh: curr?.refresh });
      try {
        setUser(jwt_decode(access));
      } catch {
        // decode 실패해도 토큰은 저장됨
      }
    },
    // 로그아웃
    signOut: async () => {
      await clearTokens();
      setUser(null);
    },
  }), [user, bootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
