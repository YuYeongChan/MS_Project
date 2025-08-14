import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../utils/config';
import Postcode from '@actbase/react-daum-postcode';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';

// --- 재사용 가능한 입력 필드 컴포넌트 ---
const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#bdc3c7"
      keyboardType={keyboardType}
      maxLength={maxLength}
    />
  </View>
);

const EditUserInfoScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userInfo } = route.params;

  const [nickname, setNickname] = useState(userInfo.nickname || '');
  const [phoneNumber, setPhoneNumber] = useState(userInfo.phone_number || '');
  const [address, setAddress] = useState(userInfo.address || '');
  const [detailAddress, setDetailAddress] = useState(userInfo.detail_address || '');
  const [profilePhoto, setProfilePhoto] = useState(userInfo.profile_pic_url ? `${API_BASE_URL}/profile_photos/${userInfo.profile_pic_url}` : null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('auth_token');
    const formData = new FormData();

    formData.append('nickname', nickname);
    formData.append('phone_number', phoneNumber);
    formData.append('address', address);
    formData.append('detail_address', detailAddress);

  
    if (profilePhoto && !profilePhoto.startsWith('http')) {
      const filename = profilePhoto.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('profile_pic', {
        uri: Platform.OS === 'android' ? profilePhoto : profilePhoto.replace('file://', ''),
        name: filename,
        type,
      });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/update_user_info`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.token) {
          await AsyncStorage.setItem('auth_token', result.token);
        }
        Alert.alert('수정 완료', '회원 정보가 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('수정 실패', result.message || '오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('수정 오류:', error);
      Alert.alert('오류', '서버와의 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatPhoneNumber = (text) => {
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length > 11) digits = digits.substring(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>정보 수정</Text>

          {/* [핵심 수정] 프로필 사진 UI 복원 및 최신 디자인 적용 */}
          <View style={styles.profileContainer}>
            <TouchableOpacity onPress={pickProfilePhoto}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                  <Feather name="user" size={50} color="#fff" />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Feather name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <InputField
            label="닉네임"
            value={nickname}
            onChangeText={setNickname}
            placeholder="새 닉네임을 입력하세요"
          />
          <InputField
            label="전화번호"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
            placeholder="010-1234-5678"
            keyboardType="number-pad"
            maxLength={13}
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>주소</Text>
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.input, styles.addressInput]} 
                value={address}
                editable={false}
                placeholder="주소 검색 버튼을 눌러주세요"
                placeholderTextColor="#bdc3c7"
                multiline 
              />
              <TouchableOpacity style={styles.addressButton} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.addressButtonText}>검색</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <InputField
            label="상세주소"
            value={detailAddress}
            onChangeText={setDetailAddress}
            placeholder="상세주소를 입력하세요"
          />

          <TouchableOpacity
            style={styles.mainButton}
            onPress={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainButtonText}>수정 완료</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{flex: 1}}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>
            <Postcode
                style={{ flex: 1 }}
                jsOptions={{ animation: true }}
                onSelected={(data) => {
                    setAddress(data.address);
                    setIsModalVisible(false);
                }}
                onError={() => setIsModalVisible(false)}
            />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// --- 스타일시트 ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 50,
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  profileImagePlaceholder: {
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498DB',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f4f6f8',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  addressInput: {
    flex: 1,
    height: 80, 
    textAlignVertical: 'top', 
    paddingTop: 12, 
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressButton: {
    marginLeft: 10,
    backgroundColor: '#95a5a6',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 10,
  },
  addressButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mainButton: {
    backgroundColor: '#3498DB',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  }
});

export default EditUserInfoScreen;