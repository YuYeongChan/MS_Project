import React, { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import jwt_decode from "jwt-decode";
import { signIn } from "../auth/authApi";
import { useAuth } from "../auth/authProvider";

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
      const res = await signIn({ user_id: userId, password: password});

      const access = res.token;
      const refresh = res.refreshToken;
      if (!access) throw new Error("로그인 실패: 토큰이 없습니다.");

      await completeSignIn({ access, refresh });

      // 역할 분기
      // const decoded = jwt_decode(access);
      // if (decoded?.role === "admin") {
      //   navigation.replace("AdminMainScreen");
      // } else {
      //   navigation.replace("UserTabNavigator");
      // }

      Alert.alert("로그인 성공", res.result || "로그인에 성공했습니다!");
    } catch (e) {
      console.error("로그인 실패:", e);
      Alert.alert(
        "로그인 실패",
        String(e?.message || "사용자 ID 또는 비밀번호가 올바르지 않습니다.")
      );
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#436D9D",
    padding: 20,
  },
  title: {
    fontSize: 35,
    fontFamily: "PretendardGOV-Bold",
    color: "white",
    marginBottom: 40,
  },
  input: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    fontFamily: "PretendardGOV-Bold",
  },
  loginButton: {
    width: "90%",
    backgroundColor: "#6f8cadff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 19,
    fontFamily: "PretendardGOV-Bold",
  },
  signupButton: {
    marginTop: 20,
    padding: 10,
  },
  signupText: {
    color: "#ADD8E6",
    fontSize: 16,
    textDecorationLine: "underline",
    fontFamily: "PretendardGOV-Bold",
  },
});

export default AccountScreen;