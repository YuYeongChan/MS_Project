import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  SafeAreaView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt_decode from 'jwt-decode';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons'; 
import { API_BASE_URL } from '../utils/config';
import { apiFetch } from '../auth/api';
import { getTokens } from '../auth/authStorage'
import { useAuth } from '../auth/authProvider';

// --- 개선된 디자인을 위한 컴포넌트 ---

const InfoRow = ({ iconName, label, value }) => (
  <View style={styles.infoRow}>
    <Feather name={iconName} size={20} color="#555" style={styles.icon} />
    <View style={styles.textContainer}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);


// --- 메인 화면 컴포넌트 ---
const MyInfoScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
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
          await AsyncStorage.removeItem('auth_token');
          navigation.replace("AccountScreen");
        }
      } else {
        navigation.replace("AccountScreen");
      }
    };

    if (isFocused) {
      loadUserInfo();
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
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>내 정보</Text>

        <View style={styles.card}>
            {userInfo.profile_pic_url ? (
            <Image
                source={{ uri: `${API_BASE_URL}/profile_photos/${userInfo.profile_pic_url}` }}
                style={styles.profileImage}
            />
            ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Feather name="user" size={60} color="#fff" />
            </View>
            )}

            <View style={styles.infoSection}>
                <InfoRow iconName="user" label="이름" value={userInfo.name} />
                <InfoRow iconName="award" label="닉네임" value={userInfo.nickname} />
                <InfoRow iconName="mail" label="이메일(ID)" value={userInfo.user_id} />
                <InfoRow iconName="map-pin" label="주소" value={userInfo.address || "-"} />
                <InfoRow iconName="phone" label="전화번호" value={userInfo.phone_number || "-"} />
                <InfoRow iconName="star" label="점수" value={`${userInfo.score}점`} />
            </View>
        </View>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigation.navigate("EditUserInfoScreen", { userInfo })}>
          <Text style={styles.mainButtonText}>정보 수정</Text>
        </TouchableOpacity>

        {/* [수정] 로그아웃 및 회원탈퇴 UI를 이전 방식으로 복원 */}
        <View style={styles.linkContainer}>
            <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.linkText}>로그아웃</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity onPress={handleDeleteAccount}>
                <Text style={[styles.linkText, styles.destructiveLinkText]}>회원 탈퇴</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};


// --- 개선된 스타일시트 ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // [수정] 전체적인 톤을 맞추기 위해 밝은 회색 배경으로 변경
    backgroundColor: '#f4f6f8',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    // [수정] 배경색에 맞춰 텍스트 색상 변경
    color: '#2c3e50',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 25,
    marginBottom: 25,
    // [수정] 그림자 효과를 더 부드럽게 조정
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#3498DB',
    marginBottom: 20,
  },
  profileImagePlaceholder: {
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    // [수정] 구분선 색상을 더 연하게 변경
    borderBottomColor: '#ecf0f1',
  },
  icon: {
    marginRight: 15,
    marginTop: 4,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  value: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    flexShrink: 1,
  },
  mainButton: {
    backgroundColor: '#3498DB',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // [수정] 이전 UI를 위한 스타일 복원
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  linkSeparator: {
    color: '#bdc3c7',
    marginHorizontal: 10,
  },
  destructiveLinkText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
});

export default MyInfoScreen;
