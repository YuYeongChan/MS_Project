import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminTopBar() {
    const navigation = useNavigation();

    const handleLogout = async () => {
        Alert.alert(
            "로그아웃",
            "정말로 로그아웃하시겠습니까?",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "확인",
                    onPress: async () => {
                        await AsyncStorage.multiRemove(["auth_token", "user_id"]);
                        Alert.alert("로그아웃", "로그아웃되었습니다.");
                        navigation.replace("AccountScreen");
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.logoText}>
                City Snap
            </Text>
            
            <View style={styles.iconContainer}>
                <TouchableOpacity onPress={() => {alert("알림 조회")}} style={styles.iconButton}>
                    <Ionicons 
                        name="notifications-outline" 
                        size={30} 
                        color="#F9F9F9"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
                    <Ionicons 
                        name="log-out-outline" 
                        size={35} 
                        color="#F9F9F9"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 15,
        height: '10%',
        backgroundColor: '#436D9D',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16
    },
    logoText: {
        color: '#F9F9F9',
        fontSize: 25,
        fontFamily: 'PretendardGOV-ExtraBold'
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15, 
    },
    iconButton: {
        padding: 5, 
    }
});