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
import { googleMapsApiKey } from '../utils/config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';



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
  const [voiceState, setVoiceState] = useState("idle");

 
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

    // ✅ handleLocation 함수가 이제 주소 정보도 함께 받습니다.


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
      setVoiceState("recording");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted'){ 
           Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
          setVoiceState("idle");
          return;
          };
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('오류', '음성 녹음 시작에 실패했습니다.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      console.log("녹음 중지 요청");
      setVoiceState("processing");

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      console.log(" 서버에 업로드 요청 시작");

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      });

      const response = await axios.post(`${API_BASE_URL}/upload_audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data.result;
      console.log(" AI 구조화 결과:", result);

      // 상세 내용 업데이트
      const combinedDetail = `${result["공공기물 종류"] || ""} - ${result["발견된 문제 또는 점검 필요 사유"] || ""}`;
      setDetail(combinedDetail);

      // 주소가 존재하면 → 위도경도 변환 시도
      if (typeof result["장소"] === "string") {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(result["장소"])}&key=${googleMapsApiKey}`
        );
        const geoData = await geoRes.json();

        if (geoData.status === "OK") {
          const loc = geoData.results[0].geometry.location;
          setLocation({
            address: result["장소"],
            lat: loc.lat,
            lng: loc.lng,
          });
          console.log(" 위치 변환 성공:", loc);
        } else {
          // 변환 실패 시 lat/lng 0으로 설정
          setLocation({
            address: result["장소"],
            lat: 0,
            lng: 0,
          });
          console.warn("위치 변환 실패: status =", geoData.status);
        }
      }
    } catch (error) {
      console.warn("오류 발생:", error);
      Alert.alert("오류", "음성 분석 중 오류가 발생했습니다.");
    } finally {
      setVoiceState("idle");
      setVisible(false);
    }
  };


    // 음성 녹음 종료
  //   const stopRecording = async () => {
  //     console.log("녹음 중지 요청");
  //     setVoiceState("processing");
  //     await recording.stopAndUnloadAsync();
  //     const uri = recording.getURI();


  //     console.log("녹음 완료, URI:", uri);
  //     console.log("서버에 업로드 요청 시작");

  //     const formData = new FormData();
  //     formData.append("file", {
  //         uri: uri,
  //         name: "recording.m4a",
  //         type: "audio/m4a",
  //     });

  //     axios.post(`${API_BASE_URL}/upload_audio`, formData, {
  //         headers: { "Content-Type": "multipart/form-data" },
  //     })
  //     .then((res) => {
  //         const result = res.data.result;
  //         console.log(result);

  //         if (typeof result["장소"] === "string") {
  //             fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(result["장소"])}&key=${googleMapsApiKey}`)
  //                 .then(r => r.json())
  //                 .then(data => {
  //                     if (data.status === "OK") {
  //                         const loc = data.results[0].geometry.location;
  //                         setLocation({
  //                             address: result["장소"],
  //                             lat: loc.lat,
  //                             lng: loc.lng
  //                         });
  //                     } else {
  //                         setLocation({
  //                             address: result["장소"],
  //                             lat: 0,
  //                             lng: 0
  //                         });
  //                     }
  //                 })
  //                 .catch(e => {
  //                     console.warn("주소 변환 실패:", e);
  //                     setLocation({
  //                         address: result["장소"],
  //                         lat: 0,
  //                         lng: 0
  //                     });
  //                 });
  //         }

  //         // ✅ 여기가 then 블록 안
  //         const combinedDetail =
  //             `${result["공공기물 종류"] || ""} - ${result["발견된 문제 또는 점검 필요 사유"] || ""}`;
  //         setDetail(combinedDetail);
  //     })
  //     .catch((e) => {
  //         console.warn("upload_audio 요청 실패:", e);
  //         Alert.alert("오류", "서버 통신 실패");
  //     });
  // };
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
                        {voiceState !== "processing" && (
                          <Text style={styles.voiceDescription}>AI 음성 등록 서비스</Text>
                        )}

                        {/* 대기 상태 */}
                        {voiceState === "idle" && (
                          <>
                            <TouchableOpacity onPress={startRecording} style={styles.micButton}>
                              <Icon name="microphone-outline" size={100} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.voiceDescription}>버튼을 눌러 녹음을 시작하세요.</Text>
                          </>
                        )}

                        {/* 녹음 중 */}
                        {voiceState === "recording" && (
                          <>
                            <TouchableOpacity onPress={stopRecording} style={styles.micRecordingButton}>
                              <Icon name="microphone-outline" size={100} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.voiceDescription}>녹음 중 입니다.</Text>
                          </>
                        )}

                        {/* AI 처리 중 */}
                        {voiceState === "processing" && (
                          <>
                            <Text style={styles.voiceDescription}>AI 구조화 중 입니다.</Text>
                           <ActivityIndicator 
                              size="large" 
                              color="#7ED8C2" 
                              style={{ transform: [{ scale: 4 }], marginTop: 50 }} 
                            />
                          </>
                        )}
                      </View>
                    )}

                    {/* {modalType === "voice" && (
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
                    )} */}
                </View>
                </View>
            </Modal>
        </ScrollView>
    </View>
  );
};

export default PublicPropertyReportScreen;



