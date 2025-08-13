import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../style/NoticeBoardStyle";
import { API_BASE_URL } from "../../utils/config";
import AdminNoticeWrite from "./AdminNoticeWrite"; 

export default function AdminNoticeContent() {
  const [notices, setNotices] = useState([]);
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // '글쓰기' 또는 '수정하기' 모드를 관리하는 상태
  const [isWriteMode, setIsWriteMode] = useState(false); 
  // 수정할 공지 데이터를 임시 저장할 상태
  const [editingNotice, setEditingNotice] = useState(null); 

  const PAGE_SIZE = 4;

  // 공지사항 목록을 불러오는 함수
  const fetchNotices = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/get_notices`)
      .then((response) => response.json())
      .then((data) => {
        let parsed = typeof data === "string" ? JSON.parse(data) : data;
        setNotices(parsed);
      })
      .catch((error) => {
          console.error("공지사항 불러오기 오류:", error);
          Alert.alert("오류", "공지사항을 불러오는데 실패했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 공지사항 삭제 처리 함수
  const handleDelete = (id) => {
    Alert.alert("공지사항 삭제", "정말로 이 공지사항을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "삭제", 
        style: "destructive", 
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/delete_notices?id=${id}`);
            if (response.ok) {
              Alert.alert("성공", "공지사항이 삭제되었습니다.");
              setNotices(prev => prev.filter(n => n.id !== id));
              setVisible(false);
            } else {
                const errorData = await response.json();
                Alert.alert("삭제 실패", errorData.message || "서버 오류가 발생했습니다.");
            }
          } catch (error) {
            console.error("삭제 중 오류:", error);
            Alert.alert("오류", "네트워크 오류가 발생했습니다.");
          }
        }
      }
    ]);
  };

  // 글쓰기 또는 수정이 완료되었을 때 호출되는 함수
  const handleSubmission = () => {
    setIsWriteMode(false); // 작성/수정 화면 닫기
    setEditingNotice(null); // 수정 데이터 초기화
    fetchNotices();       // 최신 목록으로 새로고침
  };
  
  // 'isWriteMode'가 true이면, '글쓰기' 또는 '수정' 화면을 렌더링
  if (isWriteMode) {
    return (
      <AdminNoticeWrite 
        initialData={editingNotice} // '수정' 시 기존 데이터를 전달, '글쓰기' 시 null 전달
        onCancel={() => { setIsWriteMode(false); setEditingNotice(null); }} 
        onSubmited={handleSubmission} 
      />
    );
  }

  const fixedNotices = notices.filter(n => n.fixed);
  const normalNotices = notices.filter(n => !n.fixed);
  const totalPages = Math.ceil(normalNotices.length / PAGE_SIZE);
  const pagedNotices = normalNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 공지사항 목록 아이템 렌더링 함수
  const renderNoticeItem = (item) => {
    const icon = item.type === 0 ? "warning" : item.type === 1 ? "information-circle" : "checkmark-circle";
    const iconColor = item.type === 0 ? "#c91515" : item.type === 1 ? "#436D9D" : "#008000";
    return (
      <TouchableOpacity 
        key={item.id} 
        style={styles.noticeBox} 
        onPress={() => { setSelectedNotice(item); setVisible(true); }}
      >
        <Ionicons name={icon} size={24} color={iconColor} style={{ marginRight: 10 }} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.noticeDate}>{item.notice_date}</Text> 
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>관리자 공지사항</Text>
        <TouchableOpacity style={styles.writeButton} onPress={() => setIsWriteMode(true)}>
            <Text style={styles.writeButtonText}>글 쓰기</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#436D9D" style={{ marginTop: 50 }} />
      ) : (
        <>
          {fixedNotices.map(renderNoticeItem)}
          {pagedNotices.map(renderNoticeItem)}

          {totalPages > 1 && (
            <View style={styles.pageButtonArea}>
              <TouchableOpacity style={styles.pageButton} disabled={page === 1} onPress={() => setPage(page - 1)}>
                <Text style={page === 1 ? styles.disabledText : styles.pageButtonText}>이전</Text>
              </TouchableOpacity>
              <Text style={styles.pageButtonText}>{page} / {totalPages}</Text>
              <TouchableOpacity style={styles.pageButton} disabled={page === totalPages} onPress={() => setPage(page + 1)}>
                <Text style={page === totalPages ? styles.disabledText : styles.pageButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {selectedNotice && (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalContentHeader}>
                <Text style={styles.modalTitle}>{selectedNotice.title}</Text>
                <Text style={styles.modalDate}>{selectedNotice.date}</Text>
              </View>
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.modalContentText}>{selectedNotice.content}</Text>
              </ScrollView>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={() => {
                    setEditingNotice(selectedNotice); // 수정할 데이터 저장
                    setVisible(false);                // 상세 모달 닫기
                    setIsWriteMode(true);             // 글쓰기/수정 화면 열기
                  }}
                >
                  <Text style={styles.modalButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => handleDelete(selectedNotice.id)}
                >
                  <Text style={styles.modalButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setVisible(false)}>
                <Text style={styles.modalButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}