import * as SecureStore from 'expo-secure-store';

// 사용할 key의 이름
const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

// 로그인 or 갱신 시 토큰을 암호화 저장
export async function saveTokens({ access, refresh }) {
  if (access) await SecureStore.setItemAsync(ACCESS, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
}

// 토큰 읽기
export async function getTokens() {
  const access = await SecureStore.getItemAsync(ACCESS);
  const refresh = await SecureStore.getItemAsync(REFRESH);
  return { access, refresh };
}

// 로그아웃 시 토큰 삭제
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
