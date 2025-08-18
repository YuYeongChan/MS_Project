import { getTokens, saveTokens, clearTokens } from './authStorage';

// build 시 EXPO_PUBLIC_API_BASE_URL 값이 있으면 사용, 없으면 해당 url 사용
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || '';

// refresh 엔드포인트
const REFRESH_PATH = '/auth/refresh';

// 동시 401을 한 번만 처리하기 위한 single-flight
let refreshPromise = null;

// 실제 리프레시 호출
async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    // 서버가 401/400 등을 주면 실패로 간주
    const txt = await res.text().catch(() => '');
    throw new Error(`refresh failed: ${res.status} ${txt}`);
  }
  const data = await res.json().catch(() => ({}));

  // 서버 응답: { accessToken, refreshToken? }
  if (!data?.accessToken) {
    throw new Error('refresh failed: no accessToken');
  }
  // 새 refreshToken을 주면 교체, 아니면 기존 것 유지
  const next = {
    access: data.accessToken,
    refresh: data.refreshToken ?? refreshToken,
  };
  await saveTokens(next);
  return next;
}

async function doRefreshOnce(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parseResponse(res) {
  const ct = res.headers.get('content-type') || '';
  const isJSON = ct.includes('application/json');
  const body = isJSON ? await res.json().catch(() => ({})) : await res.text();
  return { isJSON, body };
}

export async function apiFetch(path, init = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  // 기본 헤더
  const headers = { Accept: 'application/json', ...(init.headers || {}) };

  // 저장된 access 토큰 자동 첨부
  const tokens = await getTokens();
  if (tokens?.access && !headers.Authorization) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  // (선택) 타임아웃
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (e) {
    clearTimeout(t);
    throw new Error(`Network error: ${String(e.message || e)}`);
  }
  clearTimeout(t);

  // 401이면 한 번만 refresh → 재시도
  if (res.status === 401 && tokens?.refresh) {
    try {
      const next = await doRefreshOnce(tokens.refresh);
      const retryHeaders = { ...headers, Authorization: `Bearer ${next.access}` };
      const retryRes = await fetch(url, { ...init, headers: retryHeaders });
      if (!retryRes.ok) {
        const parsed = await parseResponse(retryRes);
        const err =
          parsed.isJSON ? parsed.body?.error || JSON.stringify(parsed.body) : parsed.body;
        throw new Error(`HTTP ${retryRes.status}: ${err || 'Unauthorized'}`);
      }
      return retryRes;
    } catch (e) {
      await clearTokens(); // 세션 만료 처리
      throw new Error('Session expired. Please sign in again.');
    }
  }

  // 2xx 외 에러 정규화
  if (!res.ok) {
    const parsed = await parseResponse(res);
    const err =
      parsed.isJSON ? parsed.body?.error || JSON.stringify(parsed.body) : parsed.body;
    throw new Error(`HTTP ${res.status}: ${err || 'Request failed'}`);
  }

  return res;
}

// 편의 함수들(선택)
// api 요청을 바로 하지 않고 이 api로 대체하여 요청
export const api = {
  get: (p) => apiFetch(p, { method: 'GET' }).then((r) => r.json()),
  postJSON: (p, data) =>
    apiFetch(p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ?? {}),
    }).then((r) => r.json()),
  postForm: (p, formData) =>
    apiFetch(p, { method: 'POST', body: formData }).then((r) => r.json()),
  // delete 메서드 추가
  delete: (p) => apiFetch(p, { method: 'DELETE' }).then((r) => r.json()),
};