import React, { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet, // 스타일을 위해 StyleSheet 임포트
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 중요: Python FastAPI 서버의 기본 URL 설정 ---
// 이 부분은 나중에 설정하기로 했으므로, 현재는 플레이스홀더를 유지합니다.
// 실제 사용 시에는 FastAPI 서버의 IP 주소와 포트로 변경해야 합니다.
// 예: 'http://192.168.1.100:8000' 또는 'http://localhost:8000' (에뮬레이터/시뮬레이터용)
// const API_BASE_URL = 'http://192.168.56.1:1234'; 
const API_BASE_URL = 'http://192.168.254.107:1234';
//test 
// user_test_01
// password123!
// 다른 계정들의 비밀번호는 qwer1234!
const LoginScreen = ({ navigation }) => { // navigation prop을 받도록 수정 (화면 이동용)
    const [userId, setUserId] = useState(""); // 사용자 ID 상태
    const [password, setPassword] = useState(""); // 비밀번호 상태
    const [isLoading, setIsLoading] = useState(false); // 로딩 상태

    const handleLogin = async () => {
        // 1. 입력 필드 유효성 검사
        if (!userId.trim()) {
            Alert.alert("알림", "사용자 ID를 입력해주세요.");
            return;
        }
        if (!password.trim()) {
            Alert.alert("알림", "비밀번호를 입력해주세요.");
            return;
        }

        setIsLoading(true); // 로딩 시작

        // 2. FormData 객체 생성
        const formData = new FormData();
        formData.append('user_id', userId); // FastAPI 백엔드의 Form 파라미터 이름과 일치
        formData.append('password', password); // FastAPI 백엔드의 Form 파라미터 이름과 일치

        try {
            // 3. FastAPI 서버로 HTTP POST 요청 보내기
            // 'API_BASE_URL'은 현재 플레이스홀더이므로, 실제 서버와 통신하려면 변경해야 합니다.
            const response = await fetch(`${API_BASE_URL}/account.sign.in`, { // FastAPI 로그인 엔드포인트
                method: 'POST',
                headers: {
                    // FormData 사용 시 'Content-Type': 'multipart/form-data'는 fetch가 자동으로 설정
                    'Accept': 'application/json', // 서버가 JSON 응답을 보낼 것임을 알림
                },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) {
                Alert.alert("로그인 성공", responseData.result || "로그인에 성공했습니다!");
                console.log("JWT 토큰:", responseData.token);

                // 토큰 및 user_id 저장
                await AsyncStorage.setItem('auth_token', responseData.token);
                await AsyncStorage.setItem('user_id', userId);

                navigation.replace('MainScreen'); 

            } else {
                // 서버에서 오류 응답 (4xx, 5xx)
                console.error("로그인 서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                Alert.alert("로그인 실패", responseData.error || responseData.result || "사용자 ID 또는 비밀번호가 올바르지 않습니다.");
            }
        } catch (error) {
            // 네트워크 오류 또는 fetch 요청 자체에서 발생한 오류
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false); // 로딩 종료
        }
    };

    return (
        <View style={loginStyles.container}>
            <Text style={loginStyles.title}>로그인</Text>

            <TextInput
                style={loginStyles.input}
                placeholder="사용자 ID"
                placeholderTextColor="#999"
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="none" // 첫 글자 자동 대문자 방지
                keyboardType="email-address" // 이메일 주소 타입 키보드 (옵션)
            />
            <TextInput
                style={loginStyles.input}
                placeholder="비밀번호"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry // 비밀번호 숨김 처리
            />

            <TouchableOpacity
                style={loginStyles.loginButton}
                onPress={handleLogin}
                disabled={isLoading} // 로딩 중일 때 버튼 비활성화
            >
                <Text style={loginStyles.buttonText}>{isLoading ? "로그인 중..." : "로그인"}</Text>
            </TouchableOpacity>

            {/* 회원가입 화면으로 이동하는 버튼 (선택 사항) */}
            <TouchableOpacity
                style={loginStyles.signupButton}
                // TODO: 실제 회원가입 화면(예: 'SignUpScreen')이 있다면 navigation.navigate로 연결
                onPress={() =>
                            navigation.navigate("SignUpScreen")
                        }
            >
                <Text style={loginStyles.signupText}>계정이 없으신가요? 회원가입</Text>
            </TouchableOpacity>
        </View>
    );
};

// --- 로그인 화면을 위한 스타일 ---
const loginStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#7145C9', // PublicPropertyReportScreen과 유사한 배경색
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 40,
    },
    input: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        width: '90%',
        backgroundColor: '#945EE2', // PublicPropertyReportScreen의 버튼 색상 참고
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupButton: {
        marginTop: 20,
        padding: 10,
    },
    signupText: {
        color: '#ADD8E6', // 연한 파란색 (링크처럼 보이도록)
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;