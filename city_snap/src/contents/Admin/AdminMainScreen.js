import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AdminMainScreen = ({ navigation }) => {
    const handleLogout = async () => {
        await AsyncStorage.removeItem("auth_token");
        await AsyncStorage.removeItem("user_id");
        Alert.alert("로그아웃", "로그아웃되었습니다.");
        navigation.replace("AccountScreen"); // 로그인 화면으로 이동
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>관리자 메인화면</Text>
            <Text style={styles.subtitle}>환영합니다, 관리자님 </Text>

            <TouchableOpacity
                style={styles.button}
                // onPress={() => navigation.navigate("UserManagementScreen")}
                onPress={() => {alert("사용자 관리")}}
            >
                <Text style={styles.buttonText}>사용자 관리</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                // onPress={() => navigation.navigate("ReportManagementScreen")}
                onPress={() => {alert("신고내역관리")}}
            >
                <Text style={styles.buttonText}>신고 내역 관리</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4F4F4",
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: "#555",
        marginBottom: 30,
    },
    button: {
        width: "80%",
        backgroundColor: "#7145C9",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 15,
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
    logoutButton: {
        marginTop: 30,
        padding: 12,
    },
    logoutText: {
        color: "#D9534F",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default AdminMainScreen;