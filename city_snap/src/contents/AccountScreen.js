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
import jwt_decode from "jwt-decode";
import { signIn } from "../auth/authApi";
import { useAuth } from "../auth/authProvider";
import { registerForPushNotificationsAsync } from "../notification/registerPushToken";

const AccountScreen = ({ navigation }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { completeSignIn } = useAuth();

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
    try {
      // FormData 방식으로 서버에 로그인 요청 + 토큰 저장(SecureStore)
      const res = await signIn({ user_id: userId, password: password });

      const access = res.token;
      const refresh = res.refreshToken;
      if (!access) throw new Error("로그인 실패: 토큰이 없습니다.");

      // 로그인 유지용 토큰 저장
      await completeSignIn({ access, refresh });

      // 알림용 토큰 발급 및 저장
      await registerForPushNotificationsAsync();

      Alert.alert("로그인 성공", res.result || "로그인에 성공했습니다!");
    } catch (e) {
      Alert.alert(
        "로그인 실패",
        "사용자 ID 또는 비밀번호가 올바르지 않습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
    backgroundColor: "#F9F9F9",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 40,
    color: "#436D9D",
    marginBottom: 40,
    fontFamily: "PretendardGOV-Bold", // [수정] 폰트 복원
  },
  input: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    fontFamily: "PretendardGOV-Bold", // [수정] 폰트 복원

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
    width: "90%",
    backgroundColor: "#6f8cad",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 19,
    fontFamily: "PretendardGOV-Bold", // [수정] 폰트 복원
  },
  signupButton: {
    marginTop: 20,
    padding: 10,
  },
  signupText: {
    color: "#3d9cdbff",
    fontSize: 16,
    textDecorationLine: "underline",
    fontFamily: "PretendardGOV-Bold", // [수정] 폰트 복원
  },
});

export default AccountScreen;
