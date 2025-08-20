import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from "react-native";
import { styles } from "../style/UserNoticeBoardStyle"; 
import { Feather } from "@expo/vector-icons"; 
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from '../utils/config';

function NoticeBoardScreen() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // 1) 공지 로드 함수 분리 (useCallback으로 메모이즈)
  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/get_notices`);
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setNotices(parsed || []);
    } catch (e) {
      console.warn("공지 불러오기 실패:", e);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면이 포커스될 때마다 새로고침 + 페이지 초기화
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchNotices();
    }, [fetchNotices])
  );

  const fixedNotices = notices.filter(n => n.fixed);
  const normalNotices = notices.filter(n => !n.fixed);
  const totalPages = Math.ceil(normalNotices.length / PAGE_SIZE);
  const pagedNotices = normalNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderNoticeItem = (item, isFixed) => {
    const icon = item.type === 0 ? "alert-triangle" : item.type === 1 ? "info" : "check-circle";
    const iconColor = item.type === 0 ? "#FF6B6B" : item.type === 1 ? "#5D8BFF" : "#4CAF50";

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.noticeBox}
        onPress={() => { setVisible(true); setSelectedNotice(item); }}
      >
        {isFixed && <Feather name="bookmark" size={20} style={{ marginRight: 8 }} color="#888" />}
        <Feather name={icon} size={24} color={iconColor} />
        <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.noticeDate}>{item.notice_date}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        {/* 선택: 수동 새로고침도 원하면 버튼 추가 */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start" }}>
          <Text style={styles.title}>공지 사항</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#436D9D" />
        ) : (
          <>
            {fixedNotices.length > 0 && (
              <View style={styles.fixedNotices}>
                {fixedNotices.map(item => renderNoticeItem(item, true))}
              </View>
            )}

            {pagedNotices.length === 0 && fixedNotices.length === 0 ? (
              <Text style={styles.emptyText}>공지사항이 없습니다.</Text>
            ) : (
              <View>
                {pagedNotices.map(item => renderNoticeItem(item, false))}
              </View>
            )}

            {totalPages > 1 && (
              <View style={styles.pageButtonArea}>
                <TouchableOpacity
                  style={styles.pageButton}
                  disabled={page === 1}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                >
                  <Text style={page === 1 ? styles.disabledText : styles.pageButtonText}>이전</Text>
                </TouchableOpacity>
                <Text style={styles.pageButtonText}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={styles.pageButton}
                  disabled={page === totalPages}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <Text style={page === totalPages ? styles.disabledText : styles.pageButtonText}>다음</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedNotice && (
              <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalContentHeader}>
                      <Text style={styles.modalTitle}>{selectedNotice.title}</Text>
                    </View>
                    <Text style={styles.modalDate}>{selectedNotice.notice_date}</Text>
                    <Text style={styles.modalAdmin}>작성자: {selectedNotice.admin_name}</Text>

                    <ScrollView style={styles.modalScrollView}>
                      <Text style={styles.modalContentText}>{selectedNotice.content}</Text>
                    </ScrollView>

                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setVisible(false)}>
                      <Text style={styles.modalButtonText}>닫기</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

export default NoticeBoardScreen;