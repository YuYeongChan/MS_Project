import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styles } from '../../style/NoticeBoardStyle';
import { API_BASE_URL } from '../../utils/config';


export default function AdminNoticeWrite({ initialData, onCancel, onSubmited }) {
  
  // initialData가 있으면 '수정 모드', 없으면 '생성 모드'로 판단
  const isEditMode = initialData !== null && initialData !== undefined;


  const [title, setTitle] = useState(isEditMode ? initialData.title : '');
  const [content, setContent] = useState(isEditMode ? initialData.content : '');
  const [noticeType, setNoticeType] = useState(isEditMode ? initialData.type : 1);
  const [loading, setLoading] = useState(false);


  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('notice_type', noticeType);
    formData.append('is_pinned', 'N');

    try {
      let response;
      if (isEditMode) {        
        // 수정 모드 API 호출
        response = await fetch(`${API_BASE_URL}/update_notice/${initialData.id}`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // 생성 모드 API 호출
        formData.append('created_by', 'admin');
        response = await fetch(`${API_BASE_URL}/create_notice`, {
          method: 'POST',
          body: formData,
        });
      }

      if (response.ok) {
        Alert.alert('성공', isEditMode ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
        onSubmited(); 
      } else {
        const errorData = await response.json();
        Alert.alert('실패', errorData.detail || '서버 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Submit 중 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.writeContainer}>
      <Text style={styles.title}>{isEditMode ? '공지사항 수정' : '공지사항 등록'}</Text>
      
      <TextInput
        style={styles.inputField}
        placeholder="제목을 입력하세요"
        value={title}
        onChangeText={setTitle}
      />
      
      <TextInput
        style={[styles.inputField, styles.contentField]}
        placeholder="내용을 입력하세요"
        value={content}
        onChangeText={setContent}
        multiline={true}
      />

      <View style={styles.noticeTypeSelector}>
        <Text style={styles.selectorLabel}>공지 종류</Text>
        <View style={styles.typeButtonContainer}>
          <TouchableOpacity 
            style={[styles.typeButton, noticeType === 1 && styles.typeButtonActive]}
            onPress={() => setNoticeType(1)}>
            <Text style={[styles.typeButtonText, noticeType === 1 && styles.typeButtonTextActive]}>일반</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, noticeType === 0 && styles.typeButtonActive]}
            onPress={() => setNoticeType(0)}>
            <Text style={[styles.typeButtonText, noticeType === 0 && styles.typeButtonTextActive]}>중요</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, noticeType === 2 && styles.typeButtonActive]}
            onPress={() => setNoticeType(2)}>
            <Text style={[styles.typeButtonText, noticeType === 2 && styles.typeButtonTextActive]}>점검</Text>
          </TouchableOpacity>
        </View>
      </View>


      {loading ? (
        <ActivityIndicator size="large" color="#436D9D" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.modalButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButton} onPress={handleSubmit}>
            <Text style={styles.modalButtonText}>{isEditMode ? '수정 완료' : '등록'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

