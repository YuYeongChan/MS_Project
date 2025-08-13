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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../utils/config';
import Postcode from '@actbase/react-daum-postcode';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../auth/api';
import { getTokens, saveTokens } from '../auth/authStorage';

const EditUserInfoScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userInfo } = route.params;

  const [nickname, setNickname] = useState(userInfo.nickname || '');
  const [phoneNumber, setPhoneNumber] = useState(userInfo.phone_number || '');
  const [address, setAddress] = useState(userInfo.address || '');
  const [detailAddress, setDetailAddress] = useState(userInfo.detail_address || '');
  const [profilePhoto, setProfilePhoto] = useState(userInfo.profile_pic_url || null);

  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // 프로필 사진 선택 함수
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

  // 회원 정보 업데이트
  const handleUpdate = async () => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('phone_number', phoneNumber);
      formData.append('address', address + ' ' + detailAddress);

      if (profilePhoto && !profilePhoto.startsWith('http')) {
        const filename = profilePhoto.split('/').pop();
        const type = `image/${filename.split('.').pop()}`;
        formData.append('profile_pic', {
          uri: Platform.OS === 'android' ? profilePhoto : profilePhoto.replace('file://', ''),
          name: filename,
          type: type,
        });
      }

      console.log(formData);
      
      // Authorization 헤더 필요 없음 (apiFetch가 자동 첨부)
      const res = await apiFetch('/update_user_info', { method: 'PATCH', body: formData });
      const result = await res.json();

      // 서버가 새 access token을 돌려주는 경우 반영
      if (result?.token) {
        const { refresh } = await getTokens(); // 기존 refresh 유지
        await saveTokens({ access: result.token, refresh });
      }

      Alert.alert('수정 완료', '회원 정보가 수정되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);

    } catch (error) {
      console.error('수정 오류:', error);
      Alert.alert('오류', '서버와의 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원 정보 수정</Text>

      {/* 프로필 사진 */}
      <TouchableOpacity onPress={pickProfilePhoto} style={styles.photoBox}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.photo} />
        ) : (
          <Text style={styles.addPhotoText}>프로필 사진 추가</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>닉네임</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="닉네임"
      />

      <Text style={styles.label}>전화번호</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={(text) => {
      
          let digits = text.replace(/[^0-9]/g, '');

          if (digits.length > 11) digits = digits.substring(0, 11);

          if (digits.length < 4) {
            setPhoneNumber(digits);
          } else if (digits.length < 8) {
            setPhoneNumber(`${digits.slice(0, 3)}-${digits.slice(3)}`);
          } else {
            setPhoneNumber(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`);
          }
        }}
        keyboardType="number-pad"
        placeholder="010-0000-0000"
        maxLength={13} 
      />

      <Text style={styles.label}>주소</Text>
      <TouchableOpacity
        style={styles.addressSearchButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.addressSearchText}>주소 검색</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        value={address}
        onChangeText={setAddress}
        placeholder="주소"
      />
      <Text style={styles.label}>상세 주소</Text>
      <TextInput
        style={styles.input}
        value={detailAddress}
        onChangeText={setDetailAddress}
        placeholder="상세 주소 (예: 101동 202호)"
      />

      <TouchableOpacity
        style={styles.updateButton}
        onPress={handleUpdate}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateText}>수정하기</Text>
        )}
      </TouchableOpacity>

      {/* 주소 검색 모달 */}
      <Modal visible={isModalVisible} animationType="slide">
        <Postcode
          style={{ flex: 1 }}
          jsOptions={{ animation: true }}
          onSelected={(data) => {
            setAddress(data.address);
            setIsModalVisible(false);
          }}
          onError={() => setIsModalVisible(false)}
        />
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#436D9D',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontFamily: 'PretendardGOV-Bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhotoText: {
    color: '#555',
    fontSize: 14,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'PretendardGOV-Bold',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: 'PretendardGOV-Regular',
    marginBottom: 10,
  },
  addressSearchButton: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
  },
  addressSearchText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'PretendardGOV-Regular',
  },
  updateButton: {
    marginTop: 30,
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  updateText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'PretendardGOV-Bold',
  },
});

export default EditUserInfoScreen;