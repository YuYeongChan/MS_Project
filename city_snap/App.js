import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TopBar from './src/contents/TopBar';
import MainScreen from "./src/contents/MainScreen";
import PublicPropertyReportScreen from './src/contents/PublicPropertyReportScreen';
import AccountScreen from "./src/contents/AccountScreen";
import SignUpScreen from "./src/contents/SignUpScreen";
import MyInfoScreen from "./src/contents/MyInfoScreen";
import DamageMapScreen from './src/contents/DamageMapScreen';
import MyDamageListScreen from './src/contents/MyDamageListScreen';
import RankingScreen from './src/contents/RankingScreen';
import SettingsScreen from './src/contents/SettingsScreen';
import NoticeBoardScreen from './src/contents/sub_contents/NoticeBoardScreen';
import AdminMainScreen from './src/contents/Admin/AdminMainScreen';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DamageScreen from './src/contents/DamageScreen';
import EditUserInfoScreen from './src/contents/EditUserInfoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const DamageStatusStack = createNativeStackNavigator();

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

          // tab icon 설정
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'MainScreen') {
              iconName = focused ? 'home' : 'home-outline';
            }
            else if (route.name === 'DamageScreen') {
              iconName = focused ? 'construct' : 'construct-outline';
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
        <Tab.Screen name="DamageScreen" component={DamageScreen} options={{ title: '파손 현황' }} />
        <Tab.Screen name="RankingScreen" component={RankingScreen} options={{ title: '순위표' }} />
        <Tab.Screen name="MyInfoScreen" component={MyInfoScreen} options={{ title: '내 정보' }} />
        <Tab.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: '설정' }} />
      </Tab.Navigator>
    </>
  );
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
      <NavigationContainer>
        <Stack.Navigator initialRouteName="AccountScreen" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AccountScreen" component={AccountScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
          <Stack.Screen name="UserTabNavigator" component={UserTabNavigator} />
          <Stack.Screen name="PublicPropertyReportScreen" component={PublicPropertyReportScreen} />
          <Stack.Screen name="AdminMainScreen" component={AdminMainScreen} />
          <Stack.Screen name="DamageMapScreen" component={DamageMapScreen} />

          <Stack.Screen name="EditUserInfoScreen" component={EditUserInfoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}