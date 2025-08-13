import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt_decode from 'jwt-decode';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../utils/config';
import { apiFetch } from '../auth/api';
import { getTokens } from '../auth/authStorage'
import { useAuth } from '../auth/authProvider';

const MyInfoScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused(); //  포커스 여부 감지
  
  const { signOut } = useAuth(); 

  useEffect(() => {
    const loadUserInfo = async () => {
      const { access } = await getTokens();
      if (access){
        try{
          const decoded = jwt_decode(access);
          setUserInfo(decoded);
        } catch (error) {
          console.error('토큰 디코딩 오류:', error);
        }
      }
    };

    if (isFocused) {
      loadUserInfo(); //  돌아올 때마다 최신 정보 불러오기
    }
  }, [isFocused]);

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        style: "destructive",
        onPress: async () => {
          await signOut();
        } 
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert("회원 탈퇴", "정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          
          try {

            const res = await apiFetch('/delete_account', { method: 'DELETE' });
            const result = await res.json();

            if(res.ok){
              Alert.alert("탈퇴 완료", "계정이 삭제되었습니다.");
              await signOut();                                // SecureStore 비우기
              navigation.replace("AccountScreen");
            } else {
              Alert.alert("탈퇴 실패", result.message || "오류가 발생했습니다.");
            }

          } catch (error) {
            console.error("탈퇴 요청 중 오류:", error);
            Alert.alert("탈퇴 실패", "오류가 발생했습니다.");
          }
        },
      },
    ]);
  };

  if (!userInfo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7145C9" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{backgroundColor: '#436D9D'}}
    >
      <Text style={styles.title}>내 정보</Text>

      {userInfo.profile_pic_url && (
        <Image
          source={{ uri: `${API_BASE_URL}/profile_photos/${userInfo.profile_pic_url}` }}
          style={styles.profileImage}
          onError={() => console.warn("프로필 사진 로딩 실패")}
        />
      )}

      <InfoRow label="이름" value={userInfo.name} />
      <InfoRow label="닉네임" value={userInfo.nickname} />
      <InfoRow label="이메일(ID)" value={userInfo.user_id} />
      <InfoRow label="주소" value={userInfo.address || "-"} />
      <InfoRow label="전화번호" value={userInfo.phone_number || "-"} />
      <InfoRow label="점수" value={`${userInfo.score}점`} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FFC107' }]}
        onPress={() => navigation.navigate("EditUserInfoScreen", { userInfo })}>
        <Text style={styles.buttonText}>정보 수정</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#dc3545' }]}
        onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>회원 탈퇴</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const shadow = {
  shadowColor: 'black',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 6,
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#436D9D',
    alignItems: 'center',
    flexGrow: 1,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#436D9D',
  },
  title: {
    fontSize: 30,
    marginBottom: 25,
    textAlign: 'center',
    color: 'white',
    fontFamily: 'PretendardGOV-Bold',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 25,
    backgroundColor: '#ddd',
    ...shadow,
  },
  row: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    ...shadow,
  },
  label: {
    color: '#436D9D',
    fontSize: 15,
    marginBottom: 5,
    fontFamily: 'PretendardGOV-Bold',
  },
  value: {
    fontSize: 16,
    color: '#222',
    fontFamily: 'PretendardGOV-Regular',
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#6f8cadff',
    paddingVertical: 12,
    paddingHorizontal: 70,
    borderRadius: 20,
    ...shadow,
  },
  logoutText: {
    fontSize: 17,
    color: 'white',
    fontFamily: 'PretendardGOV-Bold',
  },
  button: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 70,
    borderRadius: 20,
    ...shadow,
  },
  buttonText: {
    fontSize: 17,
    color: 'white',
    fontFamily: 'PretendardGOV-Bold',
    textAlign: 'center',
  },
});

export default MyInfoScreen;