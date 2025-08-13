import React, { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/config';
import jwt_decode from "jwt-decode";

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
                await AsyncStorage.setItem('auth_token', responseData.token);
                await AsyncStorage.setItem('user_id', userId);

                const decoded = jwt_decode(responseData.token);
                console.log("Decoded JWT:", decoded);

                if (decoded.role === "admin") {
                    navigation.replace('AdminMainScreen');
                } else {
                    navigation.replace('UserTabNavigator');
                }
            } else {
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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <Text style={styles.title}>City Snap</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="사용자 ID"
                        placeholderTextColor="#999"
                        value={userId}
                        onChangeText={setUserId}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="비밀번호"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>로그인</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={() => navigation.navigate("SignUpScreen")}
                    >
                        <Text style={styles.signupText}>계정이 없으신가요? 회원가입</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 40,
        color: '#436D9D',
        marginBottom: 40,
        fontFamily: 'PretendardGOV-Bold', // [수정] 폰트 복원
    },
    input: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        color: '#333',
        fontFamily: 'PretendardGOV-Bold', // [수정] 폰트 복원

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    loginButton: {
        width: '90%',
        backgroundColor: '#6f8cad',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 19,
        fontFamily: 'PretendardGOV-Bold', // [수정] 폰트 복원
    },
    signupButton: {
        marginTop: 20,
        padding: 10,
    },
    signupText: {
        color: '#3d9cdbff',
        fontSize: 16,
        textDecorationLine: 'underline',
        fontFamily: 'PretendardGOV-Bold', // [수정] 폰트 복원
    },
});

export default AccountScreen;