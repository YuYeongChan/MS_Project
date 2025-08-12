import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TopBar from '../TopBar';
import { Ionicons } from '@expo/vector-icons';

import AdminDamageContent from './AdminDamageContent';
import AdminNoticeContent from './AdminNoticeContent';
import AdminRankingContent from './AdminRankingContent';
import AdminReportListScreen from './AdminReportListScreen'; 

const Tab = createBottomTabNavigator();

export default function AdminLayout({ route }) {
  const navigation = useNavigation();
  const initialRoute = route?.params?.initialRoute ?? 'Damage';

  //  안드로이드 뒤로가기 버튼 핸들링
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      navigation.goBack(); // AdminMainScreen으로 돌아감
      return true; // 기본 뒤로가기 동작 막기
    });

    return () => backHandler.remove(); // 컴포넌트 언마운트 시 제거
  }, []);

  return (
    <>
      <TopBar />
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
      </Tab.Navigator>
    </>
  );
}