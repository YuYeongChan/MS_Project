import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminTopBar from '../AdminTopBar';
import { Ionicons } from '@expo/vector-icons';

import AdminDamageContent from './AdminDamageContent';
import AdminNoticeContent from './AdminNoticeContent';
import AdminRankingContent from './AdminRankingContent';
import AdminReportListScreen from './AdminReportListScreen'; 

const Tab = createBottomTabNavigator();

export default function AdminLayout() {
  const navigation = useNavigation();
  const route = useRoute();

  // 콜드 스타트: 최초 탭 선택
  const initialRoute = route?.params?.initialRoute ?? 'ReportList';

  // 웜/포그라운드: goToTab 파라미터가 바뀌면 해당 탭으로 이동
  useEffect(() => {
    const goTo = route?.params?.goToTab;
    if (goTo) {
      // Tab.Navigator 안에서 탭 전환
      navigation.navigate(goTo);
    }
  }, [route?.params?.goToTab, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true; // 뒤로가기 동작 처리 완료
      } else {
        navigation.navigate("AdminMainScreen"); 
        return true; // 기본 화면으로 이동 처리 완료
      }
    });

  return () => backHandler.remove();
}, [navigation]);

  return (
    <>
      <AdminTopBar />
      <Tab.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#f9f9f9',
            height: '10%',
          },
        }}
      >
        <Tab.Screen
          name="ReportList"
          component={AdminReportListScreen}
          options={{
            tabBarLabel: "전체 신고",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="file-tray-full" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Damage"
          component={AdminDamageContent}
          options={{
            tabBarLabel: "파손현황",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="hammer" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Notice"
          component={AdminNoticeContent}
          options={{
            tabBarLabel: "공지사항",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Ranking"
          component={AdminRankingContent}
          options={{
            tabBarLabel: "순위표",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}