import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ActivityIndicator,
  Alert, StyleSheet, ScrollView, TouchableOpacity
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/config";

const MyReportsScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    getUserInfoFromToken();
  }, []);

  const getUserInfoFromToken = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("로그인 필요", "auth_token이 존재하지 않습니다.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.user_id) {
        setUserId(data.user_id);
        fetchReports(data.user_id);
      } else {
        Alert.alert("유저 정보 오류", data.error || "사용자 정보를 가져올 수 없습니다.");
      }
    } catch (error) {
      Alert.alert("오류", "토큰으로 사용자 정보를 가져오는 데 실패했습니다.");
    }
  };

  const fetchReports = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/my_reports?user_id=${userId}`);
      const data = await response.json();

      if (response.ok && data.reports) {
        setReports(data.reports);
      } else {
        Alert.alert("오류", data.error || "신고 내역을 불러올 수 없습니다.");
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

              // 상태를 직접 갱신하여 실시간 반영
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
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : reports.length === 0 ? (
        <Text style={styles.empty}>등록한 신고가 없습니다.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 60, paddingBottom: 30 }}>
          {reports.map((item) => (
            <View key={item.report_id} style={styles.card}>
              <Image
                source={item.photo_url
                  ? { uri: `${API_BASE_URL}${item.photo_url}` }
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
                    상태: {item.current_status || "대기 중"}
                  </Text>
                </View>

              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default MyReportsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 10,
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
  // 상태 확인
  status: {
  fontSize: 13,
  color: "#007AFF", // 파란색 강조
  fontWeight: "500",
  marginBottom: 4,
},
});