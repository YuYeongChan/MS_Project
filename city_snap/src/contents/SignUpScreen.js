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
} from "react-native";

const API_BASE_URL = 'http://195.168.9.69:1234'; 

const SignUpScreen = ({ navigation }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [residentIdNumber, setResidentIdNumber] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isNicknameChecking, setIsNicknameChecking] = useState(false); // 닉네임 중복 검사 중 상태
    const [isNicknameAvailable, setIsNicknameAvailable] = useState(null); // 닉네임 사용 가능 여부 (true/false/null)


    // --- 닉네임 변경 핸들러 (중복 상태 초기화) ---
    const handleChangeNickname = (text) => {
        setNickname(text);
        setIsNicknameAvailable(null); // 닉네임이 변경되면 중복 상태를 초기화
    };

    // --- 닉네임 중복 확인 함수 ---
    const checkNicknameAvailability = async () => {
        if (!nickname.trim()) {
            setIsNicknameAvailable(null); // 비어있으면 초기화
            return;
        }

        setIsNicknameChecking(true);
        try {
            const response = await fetch(`${API_BASE_URL}/account.check.nickname?nickname=${nickname}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.ok) { // HTTP 200 OK
                setIsNicknameAvailable(true);
                Alert.alert("알림", "사용 가능한 닉네임입니다.");
            } else if (response.status === 409) { // HTTP 409 Conflict
                setIsNicknameAvailable(false);
                Alert.alert("알림", "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
            } else {
                // 다른 오류 (예: 500 Internal Server Error)
                const errorData = await response.json();
                console.error("닉네임 중복 확인 서버 오류:", errorData);
                setIsNicknameAvailable(null); // 오류 발생 시 불확실 상태
                Alert.alert("오류", errorData.detail || "닉네임 중복 확인 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("네트워크 오류:", error);
            setIsNicknameAvailable(null); // 네트워크 오류 시 불확실 상태
            Alert.alert("오류", "닉네임 중복 확인 중 네트워크 오류가 발생했습니다.");
        } finally {
            setIsNicknameChecking(false);
        }
    };


    const handleSignUp = async () => {
        // 1. 필수 입력 필드 유효성 검사
        if (!userId.trim()) { Alert.alert("알림", "사용자 ID를 입력해주세요."); return; }
        if (!password.trim()) { Alert.alert("알림", "비밀번호를 입력해주세요."); return; }
        if (!nickname.trim()) { Alert.alert("알림", "닉네임을 입력해주세요."); return; }
        if (!name.trim()) { Alert.alert("알림", "이름을 입력해주세요."); return; }
        if (!residentIdNumber.trim()) { Alert.alert("알림", "주민등록번호를 입력해주세요."); return; }

        // --- 2. 특정 필드 형식 유효성 검사 ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userId)) { Alert.alert("알림", "유효한 사용자 ID(이메일 형식)를 입력해주세요."); return; }
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) { Alert.alert("알림", "비밀번호는 최소 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다."); return; }
        const rrnRegex = /^\d{6}[-]\d{7}$/;
        if (!rrnRegex.test(residentIdNumber)) { Alert.alert("알림", "주민등록번호는 'YYMMDD-XXXXXXX' 형식으로 입력해주세요."); return; }
        const phoneRegex = /^01(?:0|1|[6-9])(?:\-|\s)?(?:\d{3}|\d{4})(?:\-|\s)?\d{4}$/;
        if (phoneNumber.trim() && !phoneRegex.test(phoneNumber)) { Alert.alert("알림", "유효한 전화번호 형식(예: 010-1234-5678)을 입력해주세요."); return; }

        // --- 3. 닉네임 중복 검사 확인 ---
        if (isNicknameAvailable === null || !isNicknameAvailable) {
            Alert.alert("알림", "닉네임 중복 확인을 완료하고 사용 가능한 닉네임을 입력해주세요.");
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('password', password);
        formData.append('nickname', nickname);
        formData.append('name', name);
        formData.append('address', address); 
        formData.append('resident_id_number', residentIdNumber);
        if (phoneNumber.trim()) {
            formData.append('phone_number', phoneNumber); 
        }

        try {
            const response = await fetch(`${API_BASE_URL}/account.sign.up`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) {
                Alert.alert("회원가입 성공", responseData.result || "회원가입에 성공했습니다!");
                console.log("회원가입 성공 데이터:", responseData);
                navigation.goBack(); 
            } else {
                console.error("회원가입 서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                Alert.alert("회원가입 실패", responseData.error || responseData.result || "회원가입에 실패했습니다. 다시 시도해주세요.");
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

                <TextInput
                    style={signUpStyles.input}
                    placeholder="사용자 ID (이메일 형식)"
                    placeholderTextColor="#999"
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="비밀번호 (영문, 숫자, 특수문자 포함 8자 이상)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                
                {/* 닉네임 입력 필드 및 중복 확인 버튼 */}
                <View style={signUpStyles.nicknameInputContainer}>
                    <TextInput
                        style={[signUpStyles.input, signUpStyles.nicknameInput]}
                        placeholder="닉네임"
                        placeholderTextColor="#999"
                        value={nickname}
                        onChangeText={handleChangeNickname} // 닉네임 변경 핸들러
                    />
                    <TouchableOpacity
                        style={signUpStyles.checkButton}
                        onPress={checkNicknameAvailability}
                        disabled={isNicknameChecking || !nickname.trim()} // 검사 중이거나 닉네임 비어있으면 비활성화
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

// --- 회원가입 화면을 위한 스타일 (닉네임 중복 확인 관련 스타일 추가) ---
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
        marginBottom: 12, // 입력 필드 간 간격
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    // --- 닉네임 입력 필드와 중복 확인 버튼을 위한 스타일 ---
    nicknameInputContainer: {
        flexDirection: 'row', // 가로로 배치
        width: '100%',
        marginBottom: 12,
        alignItems: 'center',
    },
    nicknameInput: {
        flex: 1, // 남은 공간을 모두 차지
        marginRight: 10, // 버튼과의 간격
        marginBottom: 0, // 기본 input의 marginBottom을 0으로 재설정 (여기서는 컨테이너가 마진을 관리)
    },
    checkButton: {
        backgroundColor: '#6A40C2', // 중복 확인 버튼 색상 (기존 버튼과 다르게)
        paddingVertical: 14, // input과 높이 맞추기
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkButtonText: {
        color: 'white',
        fontSize: 14, // 텍스트 크기
        fontWeight: 'bold',
    },
    availabilityText: {
        alignSelf: 'flex-start', // 왼쪽 정렬
        marginLeft: '5%', // input과 동일한 시작점
        marginBottom: 10, // 메시지 아래 간격
        fontSize: 13,
        fontWeight: 'bold',
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