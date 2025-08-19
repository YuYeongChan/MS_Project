import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../auth/api';

// 마지막으로 서버에 전송한 토큰을 로컬에 기억해서 중복 업로드 방지
const LAST_PUSH_TOKEN_KEY = 'last_expo_push_token';

// app.json -> extra.eas.projectId
const PROJECT_ID =
  Constants?.expoConfig?.extra?.eas?.projectId ||
  "579a817a-8dce-409a-b06f-a6913065f400";

export async function registerForPushNotificationsAsync() {
  // 실제 디바이스인지 확인, 가상 기기일 경우 토큰 발급이 어려움
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  // 안드로이드 채널 1회 생성
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  // 권한 확인/요청
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  // Expo Push Token 발급
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  const expoPushToken = tokenData?.data;
  if (!expoPushToken) return null;

  // 중복 업로드 방지: 이전에 보낸 토큰과 같으면 서버 호출 스킵
  // const lastSent = await AsyncStorage.getItem(LAST_PUSH_TOKEN_KEY);
  // if (lastSent === expoPushToken) {
  //   console.log("Already have token: " + expoPushToken);
  //   return expoPushToken;
  // }

  // test log
  console.log("Token : " + expoPushToken);

  // 서버에 토큰 저장
  try {
    await api.postJSON('/account.save_push_token', expoPushToken);
    await AsyncStorage.setItem(LAST_PUSH_TOKEN_KEY, expoPushToken);

  } catch (e) {
    console.warn('Failed to save push token on server:', e?.message || e);
    // 서버 저장 실패해도 앱 동작은 계속 가능. 다음 앱 실행 때 재 시도
  }

  return expoPushToken;
}
