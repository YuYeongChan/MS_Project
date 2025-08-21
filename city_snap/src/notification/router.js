import * as Notifications from 'expo-notifications';
import { navigationRef } from "./rootNavigation";

let _sub = null;

function routeByData(data) {
  if (!data) return;
  const { screen, params } = data;

  // AdminMainScreen으로 이동 (없으면 마운트됨)
  navigationRef.isReady() && navigationRef.navigate('AdminMainScreen', { params });

  // 웜/포그라운드에서 탭 전환을 위해 한 틱 이후 goToTab 파라미터 전달(아래 AdminLayout에서 처리)
  if (params?.goToTab) {
    setTimeout(() => {
      navigationRef.isReady() &&
        navigationRef.navigate('AdminMainScreen', { params: { goToTab: params.goToTab, bump: Date.now() } });
    }, 0);
  }
}

export function registerNotificationsRouting() {
  if (_sub) return;
  _sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response?.notification?.request?.content?.data;
    routeByData(data);
  });

  // 콜드 스타트
  (async () => {
    const last = await Notifications.getLastNotificationResponseAsync();
    const data = last?.notification?.request?.content?.data;
    routeByData(data);
  })();
}

export function unregisterNotificationsRouting() {
  if (_sub) {
    _sub.remove();
    _sub = null;
  }
}