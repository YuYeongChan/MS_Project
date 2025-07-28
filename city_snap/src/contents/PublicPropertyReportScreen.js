import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import {
    Alert,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    ActivityIndicator, // ✅ 로딩 인디케이터를 위해 추가
    ScrollView, // 추가
} from "react-native";
import GoogleMapPicker from "./sub_contents/GoogleMapPicker";
import ChooseDate from "./sub_contents/ChooseDate";
import { styles } from "../style/PublicPropertyReportStyle";
import { API_BASE_URL } from '../utils/config';
import axios from 'axios';

const PublicPropertyReportScreen = () => {
  const [photo, setPhoto] = useState(null);
  const [detail, setDetail] = useState("");
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState(null);
  const [tempSelectedLocation, setTempSelectedLocation] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);

  useEffect(() => {
    if (!date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [date]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const uploadAudioToServer = async (uri) => {
    const filename = uri.split("/").pop();
    const formData = new FormData();
    formData.append("file", {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type: "audio/x-m4a",
    });
    try {
      const res = await axios.post("http://192.168.254.107:1234/upload_audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("업로드 성공:", res.data);
    } catch (err) {
      console.error("업로드 실패:", err.message, err.response?.data || err);
    }
  };

  const handleLocation = (coords) => {
    setTempSelectedLocation(coords);
  };

  const confirmLocation = () => {
    if (tempSelectedLocation) {
      setLocation(tempSelectedLocation);
      setTempSelectedLocation(null);
      setVisible(false);
    } else {
      Alert.alert("알림", "지도를 클릭하여 위치를 선택해주세요.");
    }
  };

  const handleSubmitReport = async () => {
    if (!photo || !location?.lat || !location?.lng || !location?.address || !date || !detail.trim()) {
      Alert.alert("알림", "모든 필드를 입력해주세요. (위치 및 주소 포함)");
      return;
    }
    setIsLoading(true);
    const userId = await AsyncStorage.getItem('user_id');
    const token = await AsyncStorage.getItem('auth_token');
    if (!userId || !token) {
      Alert.alert("로그인 필요", "다시 로그인해주세요.");
      setIsLoading(false);
      return;
    }
    const filename = photo.split('/').pop();
    const fileType = `image/${filename.split('.').pop().toLowerCase()}`;
    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
      name: filename,
      type: fileType,
    });
    formData.append('location_description', `${location.address} (위도: ${location.lat.toFixed(6)}, 경도: ${location.lng.toFixed(6)})`);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);
    formData.append('address', location.address);
    formData.append('report_date', date);
    formData.append('details', detail);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${API_BASE_URL}/registration.write`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        body: formData,
      });
      const responseData = await response.json();
      if (response.ok) {
        Alert.alert("신고 성공", responseData.result || "신고가 성공적으로 등록되었습니다.");
        setPhoto(null);
        setDetail("");
        setDate(null);
        setLocation(null);
        setVisible(false);
        setModalType(null);
      } else {
        Alert.alert("신고 실패", responseData.error || "신고 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("요청 실패:", error);
      Alert.alert("오류", "서버와 통신 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('오류', '음성 녹음 시작에 실패했습니다.');
      setIsRecording(false);
    }
  };

    // 음성 녹음 종료
    const stopRecording = async () => {
        console.log("녹음 중지 요청");

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);

        console.log(" 녹음 완료, URI:", uri);
        console.log("서버에 업로드 요청 시작");

        const formData = new FormData();
        formData.append("file", {
            uri: uri,
            name: "recording.m4a",
            type: "audio/m4a",
        });

        axios.post(`${API_BASE_URL}/upload_audio`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => {
        const result = res.data.result;

        // ✅ 위치만 별도로 추출해서 location에 자동 채움
        setLocation(result["장소"]);

        // ✅ 기물 종류 + 문제 사유를 합쳐서 내용란에 채움
        const combinedDetail =
            `${result["공공기물 종류"] || ""} - ${result["발견된 문제 또는 점검 필요 사유"] || ""}`;

        setDetail(combinedDetail);
        });
    };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>공공기물 파손 등록</Text>
        <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <TouchableOpacity style={styles.recordButton} onPress={() => { setModalType("voice"); setVisible(true); }}>
                <Image source={require('./img/record_icon.png')} style={styles.recordIcon} />
                <Text style={styles.recordText}>AI 음성 등록 서비스</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>사진 등록</Text>
            <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
                {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.plusIcon}>＋</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.chooseButton} onPress={() => { setModalType("map"); setVisible(true); }}>
                <Text style={styles.submitText}>
                {location?.address || (location ? `위도 ${location.lat.toFixed(4)}, 경도 ${location.lng.toFixed(4)}` : "공공기물 위치 선택")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chooseButton} onPress={() => { setModalType("date"); setVisible(true); }}>
                <Text style={styles.submitText}>{date || "날짜 선택"}</Text>
            </TouchableOpacity>
            <View style={styles.viewStyle}>
                <Text style={styles.viewTitle}>상세 내용</Text>
                <TextInput
                style={styles.textArea}
                placeholder="파손 내용을 입력하세요"
                value={detail}
                onChangeText={setDetail}
                multiline
                />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>등록하기</Text>}
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {modalType === "map" && (
                    <View style={{ flex: 1, height: 400 }}>
                        <GoogleMapPicker onLocationSelect={handleLocation} />
                        {tempSelectedLocation && (
                        <>
                            <Text style={styles.locationAddressText}>{tempSelectedLocation.address}</Text>
                            <TouchableOpacity style={styles.modalButton} onPress={confirmLocation}>
                            <Text style={styles.submitText}>위치 확인</Text>
                            </TouchableOpacity>
                        </>
                        )}
                        <TouchableOpacity style={styles.modalButton} onPress={() => setVisible(false)}>
                        <Text style={styles.submitText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                    )}
                    {modalType === "date" && (
                    <ChooseDate onSelect={(selectedDate) => { setDate(selectedDate); setVisible(false); }} />
                    )}
                    {modalType === "voice" && (
                    <View style={styles.voiceModal}>
                        <Text style={styles.voiceTitle}>AI 음성 등록 서비스</Text>
                        <Text style={styles.voiceDescription}>음성으로 공공기물 파손 내용을 등록하세요.</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={isRecording ? stopRecording : startRecording}>
                        <Text style={styles.submitText}>{isRecording ? "녹음 종료" : "음성 녹음 시작"}</Text>
                        </TouchableOpacity>
                        {audioUri && (
                        <Text style={{ marginTop: 10, fontSize: 12 }}>
                            파일 저장 위치: {audioUri}
                        </Text>
                        )}
                        <TouchableOpacity style={[styles.modalButton, { marginTop: 10 }]} onPress={() => setVisible(false)}>
                        <Text style={styles.submitText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                    )}
                </View>
                </View>
            </Modal>
        </ScrollView>
    </View>
  );
};

export default PublicPropertyReportScreen;