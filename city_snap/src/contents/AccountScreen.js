import React, { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/config';
import jwt_decode from "jwt-decode";
import AdminMainScreen from "./Admin/AdminMainScreen"

const AccountScreen = ({ navigation }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!userId.trim()) {
            Alert.alert("알림", "사용자 ID를 입력해주세요.");
            return;
        }
        if (!password.trim()) {
            Alert.alert("알림", "비밀번호를 입력해주세요.");
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_BASE_URL}/account.sign.in`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) {
                Alert.alert("로그인 성공", responseData.result || "로그인에 성공했습니다!");
                console.log("JWT 토큰:", responseData.token);

                // 토큰 저장
                await AsyncStorage.setItem('auth_token', responseData.token);
                await AsyncStorage.setItem('user_id', userId);

                //  토큰 decode 후 role 확인
                const decoded = jwt_decode(responseData.token);
                console.log("Decoded JWT:", decoded);

                if (decoded.role === "admin") {
                    // 여기서 화면 바꿀수 있음
                    navigation.replace('AdminMainScreen'); // 관리자 메인화면
                } else {
                    navigation.replace('MainScreen'); // 일반 사용자 메인화면
                }
            } else {
                console.error("로그인 서버 응답 오류:", responseData);
                Alert.alert("로그인 실패", responseData.error || responseData.result || "사용자 ID 또는 비밀번호가 올바르지 않습니다.");
            }
        } catch (error) {
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false);
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
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={loginStyles.input}
                placeholder="비밀번호"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={loginStyles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
            >
                <Text style={loginStyles.buttonText}>
                    {isLoading ? "로그인 중..." : "로그인"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={loginStyles.signupButton}
                onPress={() => navigation.navigate("SignUpScreen")}
            >
                <Text style={loginStyles.signupText}>계정이 없으신가요? 회원가입</Text>
            </TouchableOpacity>
        </View>
    );
};

const loginStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#7145C9',
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
        backgroundColor: '#945EE2',
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
        color: '#ADD8E6',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});

export default AccountScreen;