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

const API_BASE_URL = 'http://192.168.56.1:1234'; 

const SignUpScreen = ({ navigation }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [residentIdNumber, setResidentIdNumber] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isNicknameChecking, setIsNicknameChecking] = useState(false);
    const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);
    const [isUserIdChecking, setIsUserIdChecking] = useState(false);
    const [isUserIdAvailable, setIsUserIdAvailable] = useState(null); // ID 사용 가능 여부 (true/false/null)


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


    // --- 사용자 ID 변경 핸들러 ---
    const handleChangeUserId = (text) => {
        setUserId(text);
        setIsUserIdAvailable(null); // ID가 변경되면 중복 상태를 초기화
    };

    // --- 사용자 ID 중복 확인 함수 (onBlur 시 자동 호출) ---
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

        // --- 3. 중복 검사 결과 최종 확인 (ID 및 닉네임) ---
        // 사용자 ID 중복 검사 최종 확인
        // isUserIdAvailable이 null이면 아직 검사 안 했거나 오류 상태.
        // isUserIdAvailable이 false면 중복이거나 형식 오류.
        if (isUserIdAvailable === null) {
            // 사용자가 onBlur를 거치지 않고 바로 회원가입 버튼을 누른 경우, 여기서 강제 검사
            Alert.alert("알림", "사용자 ID 중복 확인이 필요합니다. 잠시 기다려주시거나 ID 입력 후 다른 필드를 눌러주세요.");
            // 선택적으로 여기서 checkUserIdAvailabilityOnBlur()를 호출하여 검사를 시작할 수도 있습니다.
            return;
        }
        if (!isUserIdAvailable) {
            Alert.alert("알림", "사용할 수 없는 사용자 ID입니다. 다른 ID를 입력해주세요.");
            return;
        }

        // 닉네임 중복 검사 최종 확인
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
        } else {
            formData.append('phone_number', '');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/account.sign.up`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) { // HTTP 200 OK (회원가입 성공)
                Alert.alert("회원가입 성공", responseData.result || "회원가입에 성공했습니다!");
                console.log("회원가입 성공 데이터:", responseData);
                navigation.goBack(); 
            } else { // HTTP 상태 코드가 2xx가 아닌 경우 (FastAPI에서 HTTPException 발생 등)
                console.error("회원가입 서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                
                // --- 이 부분을 추가/수정합니다! ---
                // 서버에서 보낸 에러 메시지를 확인하여 특정 오류에 대한 알림
                if (responseData.detail && responseData.detail.includes("UNIQUE constraint")) {
                    Alert.alert("회원가입 실패", "이미 사용 중인 사용자 ID 또는 닉네임입니다. 다른 정보를 입력해주세요.");
                } else if (responseData.detail) {
                    Alert.alert("회원가입 실패", responseData.detail); // 서버가 보낸 구체적인 오류 메시지
                } else {
                    Alert.alert("회원가입 실패", responseData.result || "회원가입에 실패했습니다. 다시 시도해주세요.");
                }
            }
        } catch (error) { // 네트워크 오류 또는 fetch 요청 자체에서 발생한 오류
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false); // 로딩 종료
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