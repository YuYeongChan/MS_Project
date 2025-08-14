import React, { useEffect, useState } from "react";
import {
    View, Text, Image, ActivityIndicator,
    Alert, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/config";
import { api } from "../auth/api";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons"; 
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "react-native-vector-icons"; 
import { useCallback } from "react";

const MyReportsScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await api.get("/me");
      if (data?.user_id) {
        await fetchReports(data.user_id);
      } else {
        Alert.alert("유저 정보 오류", "사용자 정보를 가져올 수 없습니다.");
        setLoading(false);
      }
    } catch (error) {
      Alert.alert("오류", "사용자 정보를 가져오는 데 실패했습니다.");
      setLoading(false);
    }
  };

  const fetchReports = async (uid) => {
    try {
      const data = await api.get(`/my_reports?user_id=${encodeURIComponent(uid)}`);
      if (data?.reports) {
        setReports(data.reports);
      } else {
        Alert.alert("오류", "신고 내역을 불러올 수 없습니다.");
      }
    } catch (error) {
      Alert.alert("네트워크 오류", "서버와의 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

    const handleDelete = async (reportId) => {
        Alert.alert(
            "삭제 확인",
            "정말로 이 신고를 삭제하시겠습니까?",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("auth_token");
                            const response = await fetch(`${API_BASE_URL}/my_reports/${reportId}`, {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            });
                            const result = await response.json();
                            if (response.ok) {
                                Alert.alert("삭제 완료", "신고가 삭제되었습니다.");
                                setReports((prevReports) =>
                                    prevReports.filter((item) => item.report_id !== reportId)
                                );
                            } else {
                                Alert.alert("삭제 실패", result.error || "삭제에 실패했습니다.");
                            }
                        } catch (err) {
                            Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={30} color="#007AFF" /> 
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{flex: 1}}/>
                ) : (

                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <Text style={styles.headerTitle}>내 신고 내역</Text>
                        {reports.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>등록한 신고가 없습니다.</Text>
                            </View>
                        ) : (
                            reports.map((item) => (
                                <View key={item.report_id} style={styles.card}>
                                    <Image
                                        source={item.photo_url
                                            ? { uri: `${API_BASE_URL}/registration_photos/${item.photo_url}` }
                                            : require("./img/noimage.png")}
                                        style={styles.image}
                                    />
                                    <View style={styles.info}>
                                        <Text style={styles.title} numberOfLines={1}>
                                            {item.location_description || "제목 없음"}
                                        </Text>
                                        <Text style={styles.date}>
                                            {item.report_date ? item.report_date.slice(0, 10) : "날짜 없음"}
                                        </Text>
                                        <Text style={styles.detail} numberOfLines={2}>
                                            {item.details || "내용 없음"}
                                        </Text>
    
                                        <View style={styles.bottomRow}>
                                            <TouchableOpacity onPress={() => handleDelete(item.report_id)}>
                                                <Text style={styles.deleteText}>삭제</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.status}>
                                                상태: {item.repair_status === 1 ? "수리 완료" : "수리 대기"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>
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
    },
    backButton: {
        position: 'absolute',
        top: 50, 
        left: 10,
        zIndex: 10,
        padding: 10,
    },
    scrollContainer: {
        paddingTop: 100, 
        paddingHorizontal: 15,
        paddingBottom: 30,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        resizeMode: "cover",
        backgroundColor: "#EEE",
        marginRight: 12,
    },
    info: {
        flex: 1,
        justifyContent: "space-between",
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: "#222",
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: "#888",
        marginBottom: 6,
    },
    detail: {
        fontSize: 13,
        color: "#444",
        lineHeight: 18,
    },
    deleteText: {
        marginTop: 8,
        fontSize: 13,
        color: "#E53935",
        fontWeight: "bold",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginTop: 10,
    },
    status: {
        fontSize: 13,
        color: "#007AFF",
        fontWeight: "500",
        marginBottom: 4,
    },
});

export default MyReportsScreen;