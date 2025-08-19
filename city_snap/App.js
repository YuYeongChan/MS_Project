import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---- Screens ----
import TopBar from './src/contents/TopBar';
import MainScreen from "./src/contents/MainScreen";
import PublicPropertyReportScreen from './src/contents/PublicPropertyReportScreen';
import AccountScreen from "./src/contents/AccountScreen";
import SignUpScreen from "./src/contents/SignUpScreen";
import MyInfoScreen from "./src/contents/MyInfoScreen";
import DamageMapScreen from './src/contents/DamageMapScreen';
import RankingScreen from './src/contents/RankingScreen';
import NoticeBoardScreen from './src/contents/NoticeBoardScreen';

import EditUserInfoScreen from './src/contents/EditUserInfoScreen';
import MyReportsScreen from './src/contents/MyReportsScreen';
import AdminLayout from './src/contents/Admin/AdminLayout';
import * as Notifications from 'expo-notifications';

// ---- auth bootstrap ----
import { AuthProvider, useAuth } from './src/auth/authProvider';
import AuthGate from './src/auth/authGate';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // 포그라운드에서도 배너/알림 표시
    shouldPlaySound: true,   // 사운드 재생
    shouldSetBadge: false,   // iOS 뱃지 카운트는 사용 안 함 (원하면 true)
  }),
});

// 알림 터치 시 특정 화면으로 이동 (구현 x)
// const responseListener = useRef();

// useEffect(() => {
//   responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
//     const data = response.notification.request.content.data || {};
//     // 예: data.route = 'NoticeDetail', data.id = 123 등
//     // navigation.navigate(data.route, { id: data.id });
//   });

//   return () => {
//     if (responseListener.current) {
//       Notifications.removeNotificationSubscription(responseListener.current);
//     }
//   };
// }, []);


// for User
function UserTabNavigator() {
  return (
    <>
      <TopBar />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // tab header 숨김
          headerShown: false,

          // tab style 설정
          tabBarStyle: {
            backgroundColor: '#F9F9F9',
            height: '11%',    // 하단 tab bar 높이 조절
          },

          // tab label style 설정
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'PretendardGOV-Bold',
          },

          tabBarItemStyle: {
            paddingTop: 5,     // 전체 탭 아이템 내에서 아이콘과 텍스트의 위치 조정
          },

          // tab icon 설정
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'MainScreen') {
              iconName = focused ? 'home' : 'home-outline';
            }
            else if (route.name === 'NoticeBoardScreen') {
              iconName = focused ? 'megaphone' : 'megaphone-outline';
            }
            else if (route.name === 'RankingScreen') {
              iconName = focused ? 'trophy' : 'trophy-outline';
            }
            else if (route.name === 'MyInfoScreen') {
              iconName = focused ? 'person' : 'person-outline';
            }
            else if (route.name === 'SettingsScreen') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },

          // tab style 설정
          tabBarActiveTintColor: '#436D9D',   // 활성화된 탭 색상
          tabBarInactiveTintColor: '#000000', // 비활성화된 탭 색상
        })}
      >
        <Tab.Screen name="MainScreen" component={MainScreen} options={{ title: '홈' }} />
        <Tab.Screen name="NoticeBoardScreen" component={NoticeBoardScreen} options={{ title: '공지 사항' }} />
        <Tab.Screen name="RankingScreen" component={RankingScreen} options={{ title: '순위표' }} />
        <Tab.Screen name="MyInfoScreen" component={MyInfoScreen} options={{ title: '내 정보' }} />
      </Tab.Navigator>
    </>
  );
}

// 비로그인 시 사용 스택
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AccountScreen">
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
      <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// 일반 사용자 앱 스택
function UserAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="UserTabNavigator">
      <Stack.Screen name="UserTabNavigator" component={UserTabNavigator} />
      <Stack.Screen name="PublicPropertyReportScreen" component={PublicPropertyReportScreen} />
      <Stack.Screen name="DamageMapScreen" component={DamageMapScreen} />
      <Stack.Screen name="EditUserInfoScreen" component={EditUserInfoScreen} />
      <Stack.Screen name="MyReportsScreen" component={MyReportsScreen} />
    </Stack.Navigator>
  );
}

// 관리자 앱 스택
function AdminAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}  initialRouteName="AdminMainScreen">
      <Stack.Screen name="AdminMainScreen" component={AdminLayout} />
    </Stack.Navigator>
  );
}

// 로그인 여부, role에 따라 스위칭
function RootNavigator() {
  const { isSignedIn, user } = useAuth();
  if (!isSignedIn) return <AuthStack />;
  return user?.role === 'admin' ? <AdminAppStack /> : <UserAppStack />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'PretendardGOV-Regular': require('./fonts/PretendardGOV-Regular.otf'),
    'PretendardGOV-Bold':    require('./fonts/PretendardGOV-Bold.otf'),
    'PretendardGOV-ExtraBold':    require('./fonts/PretendardGOV-ExtraBold.otf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <AuthGate>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthGate>
      </AuthProvider>
    </View>
  );
}