import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt_decode from 'jwt-decode';
<<<<<<< HEAD
import { API_BASE_URL } from '../utils/config';
=======
>>>>>>> 64fdfd9f621af56e164e61c43406323bf16ca3d5

const MyInfoScreen = () => {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        try {
          const decoded = jwt_decode(token);
          setUserInfo(decoded);
        } catch (error) {
          console.error('토큰 디코딩 오류:', error);
        }
      }
    };
    loadUserInfo();
  }, []);

  if (!userInfo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7145C9" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
    backgroundColor: '#7145C9',
    alignItems: 'center',
    flexGrow: 1,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7145C9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: 'white',
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
    fontWeight: 'bold',
    color: '#7145C9',
    fontSize: 14,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#222',
  },
});

export default MyInfoScreen;