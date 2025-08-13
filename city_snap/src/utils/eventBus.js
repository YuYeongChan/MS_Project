const _listeners = new Map(); // event -> Set<handler> 

export const EVENTS = {
  REPORT_STATUS_UPDATED: 'REPORT_STATUS_UPDATED',
};

export const appEvents = {
  on(event, handler) {
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    _listeners.get(event).add(handler);
  },
  off(event, handler) {
    const set = _listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) _listeners.delete(event);
    }
  },
  emit(event, payload) {
    const set = _listeners.get(event);
    if (set) {
      // 핸들러 중 에러가 나도 다른 핸들러는 계속 호출되도록 안전 처리
      Array.from(set).forEach((fn) => {
        try { fn(payload); } catch (e) { console.warn('[appEvents]', e); }
      });
    }
  },
  // (옵션) 모든 리스너 제거가 필요할 때 사용
  removeAll(event) {
    if (event) _listeners.delete(event);
    else _listeners.clear();
  }
};