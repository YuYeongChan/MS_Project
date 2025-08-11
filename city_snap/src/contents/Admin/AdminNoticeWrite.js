import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styles } from '../../style/NoticeBoardStyle';
import { API_BASE_URL } from '../../utils/config';

/**
 * 공지사항 작성 및 등록을 위한 컴포넌트입니다.
 * @param {object} props - 컴포넌트 프로퍼티
 * @param {function} props.onCancel - 작성 취소 시 호출될 함수
 * @param {function} props.onSubmited - 작성 완료 및 제출 시 호출될 함수
 */
export default function AdminNoticeWrite({ onCancel, onSubmited }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * '등록' 버튼을 눌렀을 때 실행되는 함수입니다.
   * 입력 값을 검증하고, FormData 형식으로 서버에 전송합니다.
   */
  const handleRegister = async () => {
    // 입력 값 유효성 검사
    if (!title.trim() || !content.trim()) {
      Alert.alert('오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // 서버로 보낼 FormData 객체 생성
      const formData = new FormData();

      // 각 데이터를 formData에 추가
      formData.append('title', title);
      formData.append('content', content);
      formData.append('created_by', 'admin'); // TODO: 실제 로그인한 관리자 정보로 대체해야 합니다.
      formData.append('notice_type', 1);      // 0: 중요, 1: 일반
      formData.append('is_pinned', 'N');      // 'Y' or 'N'

      // fetch API를 사용하여 서버에 POST 요청
      const response = await fetch(`${API_BASE_URL}/create_notice`, {
        // --- [수정된 부분] ---
        method: 'POST', // 요청 방식을 'POST'로 명시적으로 지정합니다.
        // --------------------
        body: formData,
      });

      if (response.ok) {
        Alert.alert('성공', '공지사항이 성공적으로 등록되었습니다.');
        onSubmited(); // 부모 컴포넌트에 완료 알림
      } else {
        const errorData = await response.json();
        Alert.alert('등록 실패', errorData.detail || '서버에서 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('등록 중 오류:', error);
      Alert.alert('오류', '네트워크 또는 알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.writeContainer}>
      <Text style={styles.title}>공지사항 등록</Text>
      
      {/* 제목 입력란 */}
      <TextInput
        style={styles.inputField}
        placeholder="제목을 입력하세요"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#888"
      />
      
      {/* 내용 입력란 */}
      <TextInput
        style={[styles.inputField, styles.contentField]}
        placeholder="내용을 입력하세요"
        value={content}
        onChangeText={setContent}
        multiline={true}
        placeholderTextColor="#888"
      />

      {/* 로딩 중일 때와 아닐 때 버튼 표시 */}
      {loading ? (
        <ActivityIndicator size="large" color="#436D9D" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.buttonRow}>
          {/* 취소 버튼 */}
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.modalButtonText}>취소</Text>
          </TouchableOpacity>
          {/* 등록 버튼 */}
          <TouchableOpacity style={styles.modalButton} onPress={handleRegister}>
            <Text style={styles.modalButtonText}>등록</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}