import React, { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../utils/config";
import Postcode from "@actbase/react-daum-postcode";

const SignUpScreen = ({ navigation }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [residentIdNumber, setResidentIdNumber] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPostcodeModalVisible, setIsPostcodeModalVisible] = useState(false);

  // 중복 확인 상태
  const [isUserIdChecking, setIsUserIdChecking] = useState(false);
  const [isUserIdAvailable, setIsUserIdAvailable] = useState(null);
  const [isNicknameChecking, setIsNicknameChecking] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);

  // 주소 선택 콜백
  const handleAddressSelect = (data) => {
    const fullAddress = data.address || data.roadAddress || data.jibunAddress;
    setAddress(fullAddress);
    setIsPostcodeModalVisible(false);
  };

  // 프로필 사진 선택
  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("오류", "사진 선택 중 문제가 발생했습니다.");
    }
  };

  // 사용자 ID 중복 확인
  const checkUserIdAvailability = async () => {
    if (!userId.trim()) return Alert.alert("알림", "사용자 ID를 입력해주세요.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userId))
      return Alert.alert("알림", "유효한 이메일 형식을 입력해주세요.");

    setIsUserIdChecking(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/account.check.userid?user_id=${userId}`,
        { method: "GET" }
      );
      if (response.ok) {
        setIsUserIdAvailable(true);
        Alert.alert("사용 가능", "사용 가능한 사용자 ID입니다.");
      } else if (response.status === 409) {
        setIsUserIdAvailable(false);
        Alert.alert("중복", "이미 사용 중인 사용자 ID입니다.");
      } else {
        setIsUserIdAvailable(null);
        Alert.alert("오류", "사용자 ID 확인 중 문제가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("네트워크 오류", "ID 중복 확인 중 문제가 발생했습니다.");
    } finally {
      setIsUserIdChecking(false);
    }
  };

  // 닉네임 중복 확인
  const checkNicknameAvailability = async () => {
    if (!nickname.trim()) return Alert.alert("알림", "닉네임을 입력해주세요.");
    setIsNicknameChecking(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/account.check.nickname?nickname=${nickname}`,
        { method: "GET" }
      );
      if (response.ok) {
        setIsNicknameAvailable(true);
        Alert.alert("사용 가능", "사용 가능한 닉네임입니다.");
      } else if (response.status === 409) {
        setIsNicknameAvailable(false);
        Alert.alert("중복", "이미 사용 중인 닉네임입니다.");
      } else {
        setIsNicknameAvailable(null);
        Alert.alert("오류", "닉네임 확인 중 문제가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("네트워크 오류", "닉네임 중복 확인 중 문제가 발생했습니다.");
    } finally {
      setIsNicknameChecking(false);
    }
  };

  // 회원가입 처리
  const handleSignUp = async () => {
    if (!userId || !password || !nickname || !name || !residentIdNumber)
      return Alert.alert("알림", "필수 항목을 모두 입력해주세요.");

    if (isUserIdAvailable === null || !isUserIdAvailable)
      return Alert.alert("알림", "사용자 ID 중복 확인을 완료해주세요.");
    if (isNicknameAvailable === null || !isNicknameAvailable)
      return Alert.alert("알림", "닉네임 중복 확인을 완료해주세요.");

    setIsLoading(true);

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("password", password);
    if (profilePhoto) {
      const filename = profilePhoto.split("/").pop();
      const fileType = `image/${filename.split(".").pop()}`;
      formData.append("profile_pic", {
        uri:
          Platform.OS === "android"
            ? profilePhoto
            : profilePhoto.replace("file://", ""),
        name: filename,
        type: fileType,
      });
    }
    formData.append("nickname", nickname);
    formData.append("name", name);
    formData.append("phone_number", phoneNumber);
    formData.append("resident_id_number", residentIdNumber);

    const fullAddress = detailAddress
      ? `${address}, ${detailAddress}`
      : address;
    formData.append("address", fullAddress);

    try {
      const response = await fetch(`${API_BASE_URL}/account.sign.up`, {
    method: "POST",
    body: formData,
  });

  const rawText = await response.text(); //  JSON 파싱 전에 텍스트로 응답 확인
  console.log(" Raw response:", rawText);

  let responseData;
  try {
    responseData = JSON.parse(rawText); //  JSON 파싱 시도
  } catch (jsonError) {
    console.warn(" JSON 파싱 실패:", jsonError.message);
    Alert.alert("서버 응답 오류", "회원가입은 되었지만 서버 응답 처리에 실패했습니다.");
    setIsLoading(false);
    return;
  }

  if (response.ok) {
    Alert.alert("회원가입 성공", responseData.result || "회원가입 완료!");
    navigation.goBack();
  } else {
    Alert.alert("회원가입 실패", responseData.error || "다시 시도해주세요.");
  }
} catch (error) {
  console.error(" 네트워크 에러:", error.message);
  Alert.alert("네트워크 오류", "서버와 통신할 수 없습니다.");
} finally {
  setIsLoading(false);
}
  };

  return (
    <ScrollView contentContainerStyle={signUpStyles.scrollContainer}>
      <View style={signUpStyles.container}>
        <Text style={signUpStyles.title}>회원가입</Text>

        {/* 사용자 ID */}
        <View style={signUpStyles.inputWithButtonContainer}>
          <TextInput
            style={[signUpStyles.input, signUpStyles.inputWithButton]}
            placeholder="사용자 ID (이메일)"
            value={userId}
            onChangeText={(text) => {
              setUserId(text);
              setIsUserIdAvailable(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={signUpStyles.checkButton}
            onPress={checkUserIdAvailability}
            disabled={isUserIdChecking}
          >
            <Text style={signUpStyles.checkButtonText}>
              {isUserIdChecking ? "확인 중..." : "중복 확인"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 비밀번호 */}
        <TextInput
          style={signUpStyles.input}
          placeholder="비밀번호 (영문, 숫자, 특수문자 포함 8자 이상)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 닉네임 */}
        <View style={signUpStyles.inputWithButtonContainer}>
          <TextInput
            style={[signUpStyles.input, signUpStyles.inputWithButton]}
            placeholder="닉네임"
            value={nickname}
            onChangeText={(text) => {
              setNickname(text);
              setIsNicknameAvailable(null);
            }}
          />
          <TouchableOpacity
            style={signUpStyles.checkButton}
            onPress={checkNicknameAvailability}
            disabled={isNicknameChecking}
          >
            <Text style={signUpStyles.checkButtonText}>
              {isNicknameChecking ? "확인 중..." : "중복 확인"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 프로필 사진 */}
        <Text style={signUpStyles.photoSubtitle}>프로필 사진 (선택)</Text>
        <TouchableOpacity style={signUpStyles.photoBox} onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={signUpStyles.profilePhoto} />
          ) : (
            <Text style={signUpStyles.plusIcon}>＋</Text>
          )}
        </TouchableOpacity>

        {/* 이름 */}
        <TextInput
          style={signUpStyles.input}
          placeholder="이름"
          value={name}
          onChangeText={setName}
        />

        {/* 전화번호 */}
        <TextInput
          style={signUpStyles.input}
          placeholder="전화번호 (010-1234-5678)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={13}
        />

        {/* 주소 검색 */}
        <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
          <TextInput
            style={[signUpStyles.input, { flex: 1 }]}
            placeholder="주소 검색"
            value={address}
            editable={false}
          />
          <TouchableOpacity
            style={signUpStyles.checkButton}
            onPress={() => setIsPostcodeModalVisible(true)}
          >
            <Text style={signUpStyles.checkButtonText}>주소검색</Text>
          </TouchableOpacity>
        </View>

        {/* 상세 주소 */}
        <TextInput
          style={signUpStyles.input}
          placeholder="상세 주소 (예: 아파트 동/호수)"
          value={detailAddress}
          onChangeText={setDetailAddress}
        />

        {/* 주민등록번호 */}
        <TextInput
          style={signUpStyles.input}
          placeholder="주민등록번호 (123456-1234567)"
          value={residentIdNumber}
          onChangeText={setResidentIdNumber}
          keyboardType="numeric"
          maxLength={14}
        />

        <TouchableOpacity
          style={signUpStyles.signupButton}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={signUpStyles.buttonText}>
            {isLoading ? "가입 중..." : "회원가입"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 카카오 주소 검색 모달 */}
      <Modal visible={isPostcodeModalVisible} animationType="slide">
        <Postcode
          style={{ flex: 1 }}
          jsOptions={{ animation: true }}
          onSelected={handleAddressSelect}
        />
        <TouchableOpacity
          style={signUpStyles.closeButton}
          onPress={() => setIsPostcodeModalVisible(false)}
        >
          <Text style={signUpStyles.closeText}>닫기</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const signUpStyles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 30,
    backgroundColor: "#436D9D", // 로그인과 동일하게
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 35,
    color: "white",
    fontFamily: "PretendardGOV-Bold",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    fontFamily: "PretendardGOV-Bold",
  },
  inputWithButtonContainer: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 15,
    alignItems: "center",
  },
  inputWithButton: {
    flex: 1,
    marginRight: 10,
    marginBottom: 0,
  },
  checkButton: {
    backgroundColor: "#6f8cadff", // 로그인 버튼 색
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "PretendardGOV-Bold",
  },
  photoSubtitle: {
    alignSelf: "flex-start",
    marginBottom: 10,
    marginTop: 10,
    fontSize: 17,
    fontFamily: "PretendardGOV-Bold",
    color: "white",
  },
  photoBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  plusIcon: {
    fontSize: 40,
    color: "#888",
  },
  signupButton: {
    width: "100%",
    backgroundColor: "#6f8cadff", // 로그인 버튼 색
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 19,
    fontFamily: "PretendardGOV-Bold",
  },
  closeButton: {
    backgroundColor: "#436D9D",
    padding: 15,
    alignItems: "center",
  },
  closeText: {
    color: "white",
    fontSize: 16,
    fontFamily: "PretendardGOV-Bold",
  },
});

export default SignUpScreen;