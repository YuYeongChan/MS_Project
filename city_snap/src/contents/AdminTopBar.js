import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/authProvider';
import NotificationsPopover from './NotificationsPopover'; // 경로 확인

export default function AdminTopBar() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false); // 알림 팝업 on/off

  const handleLogout = async () => {
    Alert.alert(
      "로그아웃",
      "정말로 로그아웃하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          onPress: async () => {
            await signOut();
            Alert.alert("로그아웃", "로그아웃되었습니다.");
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.logoText}>City Snap</Text>

        <View style={styles.iconContainer}>
          {/* 알림 버튼 → 팝업 열기 */}
          <TouchableOpacity onPress={() => setOpen(true)} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={30} color="#F9F9F9" />
          </TouchableOpacity>

          {/* 로그아웃 버튼 */}
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={30} color="#F9F9F9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 알림 팝업: 고정 크기 + 내부 스크롤은 NotificationsPopover에서 처리 */}
      <NotificationsPopover visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
    height: '10%',
    backgroundColor: '#436D9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  logoText: {
    color: '#F9F9F9',
    fontSize: 25,
    fontFamily: 'PretendardGOV-ExtraBold'
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  }
});