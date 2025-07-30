import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from "./src/contents/MainScreen";
import PublicPropertyReportScreen from './src/contents/PublicPropertyReportScreen';
import AccountScreen from "./src/contents/AccountScreen";
import SignUpScreen from "./src/contents/SignUpScreen";
import MyInfoScreen from "./src/contents/MyInfoScreen";
import DamageMapScreen from './src/contents/DamageMapScreen';
import AdminMainScreen from './src/contents/Admin/AdminMainScreen';
const Stack = createNativeStackNavigator();

// npx expo start
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AccountScreen">
        {/* UserScreen */}
        <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PublicPropertyReportScreen" component={PublicPropertyReportScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="DamageMapScreen" component={DamageMapScreen}options={{ headerShown: false }} />
        {/* <Stack.Screen name="ScoreScreen" component={ScoreScreen} /> */}
        <Stack.Screen name="AccountScreen" component={AccountScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} options={{ headerShown: false }}/>
        {/* <Stack.Screen name="NotificationScreen" component={NotificationScreen} /> */}
        {/* <Stack.Screen name="SettingsScreen" component={SettingsScreen} /> */}
        
        <Stack.Screen name="MyInfoScreen" component={MyInfoScreen} options={{ headerShown: false }} />
        {/* AdminScreen */}
        <Stack.Screen name="AdminMainScreen" component={AdminMainScreen} />  


      </Stack.Navigator>
    </NavigationContainer>
  );
}