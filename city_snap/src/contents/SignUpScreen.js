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
} from "react-native";
import * as ImagePicker from "expo-image-picker"; // ImagePicker 임포트
import { API_BASE_URL } from '../utils/config';
// --- 중요: Python FastAPI 서버의 기본 URL 설정 ---
<<<<<<< HEAD
=======
>>>>>>> 64fdfd9f621af56e164e61c43406323bf16ca3d5

const SignUpScreen = ({ navigation }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [residentIdNumber, setResidentIdNumber] = useState("");
    const [profilePhoto, setProfilePhoto] = useState(null); // 선택된 프로필 사진 URI

    const [isLoading, setIsLoading] = useState(false);
    const [isNicknameChecking, setIsNicknameChecking] = useState(false);
    const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);
    const [isUserIdChecking, setIsUserIdChecking] = useState(false);
    const [isUserIdAvailable, setIsUserIdAvailable] = useState(null);


    // --- 프로필 사진 선택 함수 (PublicPropertyReportScreen 참조하여 수정) ---
    const pickProfilePhoto = async () => {
        console.log("1. [pickProfilePhoto] 함수 시작!");

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log("2. [pickProfilePhoto] 권한 요청 상태:", status);

            if (status !== 'granted') {
                Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다. 설정에서 허용해주세요.');
                console.log("3. [pickProfilePhoto] 권한 거부됨, 함수 종료.");
                return;
            }
            console.log("4. [pickProfilePhoto] 권한 'granted', 갤러리 열기 시도.");

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // PublicPropertyReportScreen과 동일하게 설정
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });
            console.log("5. [pickProfilePhoto] ImagePicker.launchImageLibraryAsync 결과:", result);

            if (!result.canceled) {
                setProfilePhoto(result.assets[0].uri);
                console.log("6. [pickProfilePhoto] 사진 선택 완료:", result.assets[0].uri);
            } else {
                console.log("7. [pickProfilePhoto] 사진 선택 취소됨.");
            }
        } catch (error) {
            console.error("8. [pickProfilePhoto] 예측하지 못한 오류 발생:", error);
            Alert.alert('오류', '사진 선택 중 문제가 발생했습니다: ' + error.message);
        }
    };


    // --- 닉네임 변경 핸들러 및 중복 확인 함수 (변경 없음) ---
    const handleChangeNickname = (text) => {
        setNickname(text);
        setIsNicknameAvailable(null);
    };

    const checkNicknameAvailability = async () => {
        if (!nickname.trim()) {
            setIsNicknameAvailable(null);
            Alert.alert("알림", "닉네임을 입력해주세요.");
            return;
        }

        setIsNicknameChecking(true);
        try {
            const response = await fetch(`${API_BASE_URL}/account.check.nickname?nickname=${nickname}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                setIsNicknameAvailable(true);
                Alert.alert("알림", "사용 가능한 닉네임입니다.");
            } else if (response.status === 409) {
                setIsNicknameAvailable(false);
                Alert.alert("알림", "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
            } else {
                const errorData = await response.json();
                console.error("닉네임 중복 확인 서버 오류:", errorData);
                setIsNicknameAvailable(null);
                Alert.alert("오류", errorData.detail || "닉네임 중복 확인 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("네트워크 오류:", error);
            setIsNicknameAvailable(null);
            Alert.alert("오류", "닉네임 중복 확인 중 네트워크 오류가 발생했습니다.");
        } finally {
            setIsNicknameChecking(false);
        }
    };


    // --- 사용자 ID 변경 핸들러 및 중복 확인 함수 (변경 없음) ---
    const handleChangeUserId = (text) => {
        setUserId(text);
        setIsUserIdAvailable(null);
    };

    const checkUserIdAvailabilityOnBlur = async () => {
        if (!userId.trim()) {
            setIsUserIdAvailable(null);
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userId)) {
            Alert.alert("알림", "유효한 사용자 ID(이메일 형식)를 입력해주세요.");
            setIsUserIdAvailable(false);
            return;
        }

        setIsUserIdChecking(true);
        try {
            const response = await fetch(`${API_BASE_URL}/account.check.userid?user_id=${userId}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                setIsUserIdAvailable(true);
            } else if (response.status === 409) {
                setIsUserIdAvailable(false);
                Alert.alert("알림", "이미 사용 중인 사용자 ID입니다. 다른 ID를 입력해주세요.");
            } else {
                const errorData = await response.json();
                console.error("사용자 ID 중복 확인 서버 오류:", errorData);
                setIsUserIdAvailable(null);
                Alert.alert("오류", errorData.detail || "사용자 ID 중복 확인 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("네트워크 오류:", error);
            setIsUserIdAvailable(null);
            Alert.alert("오류", "사용자 ID 중복 확인 중 네트워크 오류가 발생했습니다.");
        } finally {
            setIsUserIdChecking(false);
        }
    };


    const handleSignUp = async () => {
        // 1. 필수 입력 필드 유효성 검사
        if (!userId.trim()) { Alert.alert("알림", "사용자 ID를 입력해주세요."); return; }
        if (!password.trim()) { Alert.alert("알림", "비밀번호를 입력해주세요."); return; }
        if (!nickname.trim()) { Alert.alert("알림", "닉네임을 입력해주세요."); return; }
        if (!name.trim()) { Alert.alert("알림", "이름을 입력해주세요."); return; }
        if (!residentIdNumber.trim()) { Alert.alert("알림", "주민등록번호를 입력해주세요."); return; }

        // 2. 특정 필드 형식 유효성 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userId)) { Alert.alert("알림", "유효한 사용자 ID(이메일 형식)를 입력해주세요."); return; }
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) { Alert.alert("알림", "비밀번호는 최소 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다."); return; }
        const rrnRegex = /^\d{6}[-]\d{7}$/;
        if (!rrnRegex.test(residentIdNumber)) { Alert.alert("알림", "주민등록번호는 'YYMMDD-XXXXXXX' 형식으로 입력해주세요."); return; }
        const phoneRegex = /^01(?:0|1|[6-9])(?:\-|\s)?(?:\d{3}|\d{4})(?:\-|\s)?\d{4}$/;
        if (phoneNumber.trim() && !phoneRegex.test(phoneNumber)) { Alert.alert("알림", "유효한 전화번호 형식(예: 010-1234-5678)을 입력해주세요."); return; }

        // 3. 중복 검사 결과 최종 확인 (ID 및 닉네임)
        if (isUserIdAvailable === null) { 
            Alert.alert("알림", "사용자 ID 중복 확인이 필요합니다. 잠시 기다려주시거나 ID 입력 후 다른 필드를 눌러 확인해주세요.");
            return;
        }
        if (!isUserIdAvailable) {
            Alert.alert("알림", "사용할 수 없는 사용자 ID입니다. 다른 ID를 입력해주세요.");
            return;
        }

        if (isNicknameAvailable === null || !isNicknameAvailable) {
            Alert.alert("알림", "닉네임 중복 확인을 완료하고 사용 가능한 닉네임을 입력해주세요.");
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        // DB 컬럼 순서 (추정): user_id | password | profile_pic_url | nickname | name | address | phone_number | resident_id_number | score
        // FormData append 순서를 이 DB 컬럼 순서와 유사하게 맞춰봅니다.
        formData.append('user_id', userId);
        formData.append('password', password);
        // profile_pic_url이 세 번째 컬럼이므로 여기서 추가
        if (profilePhoto) {
            const filename = profilePhoto.split('/').pop();
            const fileExtension = filename.split('.').pop();
            const fileType = `image/${fileExtension.toLowerCase()}`;
            formData.append('profile_pic', { // 백엔드에서 'profile_pic'으로 받도록 설정
                uri: Platform.OS === 'android' ? profilePhoto : profilePhoto.replace('file://', ''),
                name: filename,
                type: fileType,
            });
        } else {
            // 프로필 사진이 선택되지 않았을 경우, 백엔드에서 Optional[UploadFile] = File(None)으로 받으므로,
            // 이 필드를 아예 append하지 않거나, 명시적으로 빈 값을 보낼 수 있습니다.
            // FastAPI는 None을 기본값으로 처리하므로, 여기서는 append하지 않아도 됩니다.
            // 그러나 명시적인 `NULL` 처리를 위해 백엔드에 따라 빈 문자열을 보낼 수도 있습니다.
            // 현재 `profile_pic`이 `File(None)`이고 DAO가 `profile_pic_filename = None`을 기본으로 하므로,
            // else 블록은 필요하지 않을 수 있습니다. 테스트를 통해 결정합니다.
        }
        
        formData.append('nickname', nickname); // 네 번째 컬럼
        formData.append('name', name);         // 다섯 번째 컬럼
        formData.append('address', address);   // 여섯 번째 컬럼
        // 전화번호와 주민등록번호 순서가 DB 데이터에 따르면 서로 바뀐 것으로 보이므로, 여기도 맞춤
        formData.append('phone_number', phoneNumber.trim() ? phoneNumber : ''); // 일곱 번째 컬럼
        formData.append('resident_id_number', residentIdNumber); // 여덟 번째 컬럼 (암호화된 값이 들어갈 곳)


        try {
            const response = await fetch(`${API_BASE_URL}/account.sign.up`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) {
                Alert.alert("회원가입 성공", responseData.result || "회원가입에 성공했습니다!");
                console.log("회원가입 성공 데이터:", responseData);
                navigation.goBack(); 
            } else {
                console.error("회원가입 서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                if (responseData.detail && responseData.detail.includes("UNIQUE constraint")) {
                    Alert.alert("회원가입 실패", "이미 사용 중인 사용자 ID 또는 닉네임입니다. 다른 정보를 입력해주세요.");
                } else if (responseData.detail) {
                    Alert.alert("회원가입 실패", responseData.detail);
                } else {
                    Alert.alert("회원가입 실패", responseData.result || "회원가입에 실패했습니다. 다시 시도해주세요.");
                }
            }
        } catch (error) {
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={signUpStyles.scrollContainer}>
            <View style={signUpStyles.container}>
                <Text style={signUpStyles.title}>회원가입</Text>

                {/* 사용자 ID (이메일) 입력 필드 */}
                <TextInput
                    style={signUpStyles.input}
                    placeholder="사용자 ID (이메일 형식)"
                    placeholderTextColor="#999"
                    value={userId}
                    onChangeText={handleChangeUserId}
                    onBlur={checkUserIdAvailabilityOnBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {isUserIdChecking && <Text style={signUpStyles.checkingText}>사용자 ID 확인 중...</Text>}


                <TextInput
                    style={signUpStyles.input}
                    placeholder="비밀번호 (영문, 숫자, 특수문자 포함 8자 이상)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                
                {/* 닉네임 입력 필드 및 중복 확인 버튼 */}
                <View style={signUpStyles.inputWithButtonContainer}>
                    <TextInput
                        style={[signUpStyles.input, signUpStyles.inputWithButton]}
                        placeholder="닉네임"
                        placeholderTextColor="#999"
                        value={nickname}
                        onChangeText={handleChangeNickname}
                    />
                    <TouchableOpacity
                        style={signUpStyles.checkButton}
                        onPress={checkNicknameAvailability}
                        disabled={isNicknameChecking || !nickname.trim()}
                    >
                        <Text style={signUpStyles.checkButtonText}>
                            {isNicknameChecking ? "확인 중..." : "중복 확인"}
                        </Text>
                    </TouchableOpacity>
                </View>
                {/* 닉네임 사용 가능 여부 메시지 */}
                {isNicknameAvailable !== null && (
                    <Text style={[
                        signUpStyles.availabilityText,
                        { color: isNicknameAvailable ? 'green' : 'red' }
                    ]}>
                        {isNicknameAvailable ? "✓ 사용 가능한 닉네임입니다." : "✗ 이미 사용 중인 닉네임입니다."}
                    </Text>
                )}

                {/* --- 프로필 사진 선택 섹션 --- */}
                <Text style={signUpStyles.photoSubtitle}>프로필 사진 (선택 사항)</Text>
                <TouchableOpacity style={signUpStyles.photoBox} onPress={pickProfilePhoto}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={signUpStyles.profilePhoto} 
                        onError={(e) => {
                            console.log('이미지 로딩 실패:', e.nativeEvent.error);
                            Alert.alert('오류', '프로필 사진을 불러올 수 없습니다. 다른 사진을 선택해 주세요.');
                        }}/>
                    ) : (
                        <Text style={signUpStyles.plusIcon}>＋</Text>
                    )}
                </TouchableOpacity>

                <TextInput
                    style={signUpStyles.input}
                    placeholder="이름"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="전화번호 (선택 사항, 예: 010-1234-5678)"
                    placeholderTextColor="#999"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={13} 
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="주소 (선택 사항)"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="주민등록번호 (필수, 예: 123456-1234567)"
                    placeholderTextColor="#999"
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
                    <Text style={signUpStyles.buttonText}>{isLoading ? "가입 중..." : "회원가입"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={signUpStyles.backToLoginButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={signUpStyles.backToLoginText}>로그인 화면으로 돌아가기</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// --- 회원가입 화면을 위한 스타일 ---
const signUpStyles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 30,
        backgroundColor: '#7145C9',
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    inputWithButtonContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 12,
        alignItems: 'center',
    },
    inputWithButton: {
        flex: 1,
        marginRight: 10,
        marginBottom: 0,
    },
    checkButton: {
        backgroundColor: '#6A40C2',
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    availabilityText: {
        alignSelf: 'flex-start',
        marginLeft: 15,
        marginBottom: 10,
        fontSize: 13,
        fontWeight: 'bold',
    },
    checkingText: {
        alignSelf: 'flex-start',
        marginLeft: 15,
        marginBottom: 10,
        fontSize: 13,
        color: 'gray',
    },
    // --- 프로필 사진 관련 스타일 ---
    photoSubtitle: {
        alignSelf: 'flex-start',
        marginLeft: 0, 
        marginBottom: 10,
        marginTop: 10,
        fontSize: 17,
        fontWeight: 'bold',
        color: 'white',
    },
    photoBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ccc',
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    plusIcon: {
        fontSize: 40,
        color: '#888',
        fontWeight: 'normal',
    },
    // --- 기존 버튼 및 텍스트 스타일은 유지 ---
    signupButton: {
        width: '100%',
        backgroundColor: '#945EE2',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backToLoginButton: {
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    backToLoginText: {
        color: '#ADD8E6', 
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});

export default SignUpScreen;