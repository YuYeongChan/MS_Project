import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles }  from "../../style/AdminStyle";

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
            onPress={() => navigation.navigate("AdminLayout", { initialRoute: "Damage" })}
            >
            <Text style={styles.buttonText}>파손 현황</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate("AdminLayout", { initialRoute: "Notice" })}
                >
                <Text style={styles.buttonText}>공지사항</Text>
            </TouchableOpacity>

                <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate("AdminLayout", { initialRoute: "Ranking" })}
                >
                <Text style={styles.buttonText}>순위표 조회</Text>
            </TouchableOpacity>



            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
        </View>
    );
};



export default AdminMainScreen;