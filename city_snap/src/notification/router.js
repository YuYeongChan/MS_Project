import * as Notifications from 'expo-notifications';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './rootNavigation';

let subscription;
let pendingAction = null; // NavigationContainer 준비 전 대기할 액션

/** 공용: 액션을 안전하게 디스패치 */
function dispatchSafely(action) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
  } else {
    pendingAction = action;
  }
}

export function navigateNestedSafely(stackName, childName, params) {
  const action = CommonActions.navigate({
    name: stackName,
    params: { screen: childName, params },
  });
  dispatchSafely(action);
}

export function flushPendingRoute() {
  if (pendingAction && navigationRef.isReady()) {
    const a = pendingAction;
    pendingAction = null;
    navigationRef.dispatch(a);
  }
}

/** 단일 스크린 네비게이션(기존 호환) */
export function navigateSafely(name, params) {
  const action = CommonActions.navigate({ name, params });
  dispatchSafely(action);
}

/** 알림 payload → 네비게이션 액션으로 변환 */
function makeActionFromNotificationData(data) {
  // 권장형
  if (data?.stack && data?.screen) {
    return CommonActions.navigate({
      name: data.stack,
      params: { screen: data.screen, params: data.params },
    });
  }

  // 레거시 보정: screen만 'ReportList'로 오는 경우 → AdminMainScreen으로 감싸기
  if (data?.screen === 'ReportList') {
    return CommonActions.navigate({
      name: 'AdminMainScreen',
      params: { screen: 'ReportList', params: data.params },
    });
  }

  if (data?.screen) {
    return CommonActions.navigate({ name: data.screen, params: data.params });
  }
  return null;
}

/** 포그라운드/백그라운드 → 응답 리스너 */
export function registerNotificationsRouting() {
  subscription = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = resp?.notification?.request?.content?.data || {};
    const action = makeActionFromNotificationData(data);
    if (action) dispatchSafely(action);
  });
}

/** 콜드 스타트로 알림에서 진입했는지 캡처 */
export async function captureInitialNotificationRoute() {
  const resp = await Notifications.getLastNotificationResponseAsync();
  if (!resp) return;
  const data = resp?.notification?.request?.content?.data || {};
  const action = makeActionFromNotificationData(data);
  if (action) {
    // 아직 네비 준비 전이므로 대기로
    pendingAction = action;
  }
}

/** 해제 */
export function unregisterNotificationsRouting() {
  if (subscription) {
    Notifications.removeNotificationSubscription(subscription);
    subscription = null;
  }
}

/** 편의 함수: 관리자 탭(ReportList)로 바로 가기 */
export function goAdminReportList(openReportId) {
  navigateNestedSafely('AdminMainScreen', 'ReportList', { openReportId });
}