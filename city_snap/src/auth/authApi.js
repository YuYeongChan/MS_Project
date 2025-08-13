import { api } from './api';

// 로그인 및 토큰 저장
export async function signIn({ user_id, password, asJson = false }) {

  let data;
  if (asJson) {
    data = await api.postJSON('/account.sign.in', { user_id, password });
  } else {
    const fd = new FormData();
    fd.append('user_id', user_id);
    fd.append('password', password);
    data = await api.postForm('/account.sign.in', fd);
  }

  return data;
}