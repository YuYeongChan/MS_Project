import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from "react-native";
import { styles } from "../style/UserNoticeBoardStyle"; // 전용 스타일
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from '../utils/config';

function NoticeBoardScreen() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;

  useEffect(() => {
    fetch(`${API_BASE_URL}/get_notices`)
      .then((response) => response.json())
      .then(data => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setNotices(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
    }, [])
  );

  const fixedNotices = notices.filter(n => n.fixed);
  const normalNotices = notices.filter(n => !n.fixed);
  const totalPages = Math.ceil(normalNotices.length / PAGE_SIZE);
  const pagedNotices = normalNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>공지 사항</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#436D9D" />
      ) : (
        <View>
          {/* 고정 공지사항 */}
          {fixedNotices.length > 0 && (
            <View style={styles.fixedNotices}>
              {fixedNotices.map(item => {
                const icon = item.type === 0 ? "warning" : item.type === 1 ? "information-circle" : "checkmark-circle";
                const iconColor = item.type === 0 ? "#c91515" : item.type === 1 ? "#436D9D" : "#008000";
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.noticeBox}
                    onPress={() => { setVisible(true); setSelectedNotice(item); }}
                  >
                    <Ionicons name="flag" size={20} style={{ marginRight: 8 }} color="#888" />
                    <Ionicons name={icon} size={24} color={iconColor} />
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                    <Text style={styles.noticeDate}>{item.notice_date}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 일반 공지사항 */}
          {pagedNotices.length === 0 ? (
            <Text style={styles.emptyText}>공지사항이 없습니다.</Text>
          ) : (
            <View>
              {pagedNotices.map(item => {
                const icon = item.type === 0 ? "warning" : item.type === 1 ? "information-circle" : "checkmark-circle";
                const iconColor = item.type === 0 ? "#c91515" : item.type === 1 ? "#436D9D" : "#008000";
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.noticeBox}
                    onPress={() => { setVisible(true); setSelectedNotice(item); }}
                  >
                    <Ionicons name={icon} size={24} color={iconColor} />
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                    <Text style={styles.noticeDate}>{item.notice_date}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <View style={styles.pageButtonArea}>
              <TouchableOpacity
                style={styles.pageButton}
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
              >
                <Text style={page === 1 ? styles.disabledText : styles.pageButtonText}>이전</Text>
              </TouchableOpacity>
              <Text style={styles.pageButtonText}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={styles.pageButton}
                disabled={page === totalPages}
                onPress={() => setPage(page + 1)}
              >
                <Text style={page === totalPages ? styles.disabledText : styles.pageButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 상세 모달 */}
          <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalContentHeader}>
                  <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>
                </View>
                <Text style={styles.modalDate}>{selectedNotice?.notice_date}</Text>
                <Text style={styles.modalAdmin}>작성자: {selectedNotice?.admin_name}</Text>
                <Text style={styles.modalContentText}>{selectedNotice?.content}</Text>

                {/* 닫기 버튼 */}
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setVisible(false)}>
                  <Text style={styles.modalButtonText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </ScrollView>
  );
}

export default NoticeBoardScreen;