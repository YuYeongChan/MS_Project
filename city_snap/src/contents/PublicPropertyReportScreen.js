import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import {
  Alert,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import GoogleMapPicker from "./sub_contents/GoogleMapPicker";
import ChooseDate from "./sub_contents/ChooseDate";
import { styles } from "../style/PublicPropertyReportStyle";
import { API_BASE_URL, googleMapsApiKey } from "../utils/config";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { getTokens } from "../auth/authStorage";
import { apiFetch } from "../auth/api";
import jwt_decode from "jwt-decode";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const PublicPropertyReportScreen = () => {
  const navigation = useNavigation();

  // --- States ---
  const [photo, setPhoto] = useState(null);
  const [detail, setDetail] = useState("");
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState(null);
  const [tempSelectedLocation, setTempSelectedLocation] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Voice
  const [recording, setRecording] = useState(null);
  const [voiceState, setVoiceState] = useState("idle");
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // GPS
  const [userLocation, setUserLocation] = useState(null); // {lat, lng, address}
  const [locReady, setLocReady] = useState(false);

  // --- Init date ---
  useEffect(() => {
    if (!date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [date]);

  // --- Get current GPS on mount ---
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("위치 권한 거부됨");
          setLocReady(true);
          return;
        }

        let pos = await Location.getLastKnownPositionAsync().catch(() => null);
        if (!pos) {
          pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        if (pos?.coords) {
          const { latitude, longitude } = pos.coords;
          const addr = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          }).catch(() => []);
          const primary = addr?.[0];
          const addressText = primary
            ? [primary.region, primary.city, primary.street, primary.name]
                .filter(Boolean)
                .join(" ")
            : "현재 위치";
          setUserLocation({ lat: latitude, lng: longitude, address: addressText });
        }
      } catch (e) {
        console.warn("현재 위치 획득 실패:", e);
      } finally {
        setLocReady(true);
      }
    })();
  }, []);

  // --- Photo picker ---
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 권한을 허용해주세요.");
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

  // --- Map handlers ---
  const handleLocation = (coords) => {
    setTempSelectedLocation(coords); // {lat, lng, address}
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

  // --- Submit report ---
  const handleSubmitReport = async () => {
    if (
      !photo ||
      !location?.lat ||
      !location?.lng ||
      !location?.address ||
      !date ||
      !detail.trim()
    ) {
      Alert.alert("알림", "모든 필드를 입력해주세요. (위치 및 주소 포함)");
      return;
    }
    setIsLoading(true);

    const { access } = await getTokens();
    let userid;
    if (access) {
      try {
        const decoded = jwt_decode(access);
        userid = decoded.user_id;
      } catch (error) {
        console.error("토큰 디코딩 오류:", error);
      }
    } else {
      Alert.alert("로그인 필요", "다시 로그인해주세요.");
      setIsLoading(false);
      return;
    }

    const filename = photo.split("/").pop();
    const fileType = `image/${filename.split(".").pop().toLowerCase()}`;

    const formData = new FormData();
    formData.append("photo", {
      uri: Platform.OS === "android" ? photo : photo.replace("file://", ""),
      name: filename,
      type: fileType,
    });
    formData.append("location_description", location.address);
    formData.append("latitude", location.lat);
    formData.append("longitude", location.lng);
    formData.append("address", location.address);
    formData.append("report_date", date);
    formData.append("details", detail);
    formData.append("user_id", userid);

    try {
      const res = await apiFetch("/registration.write", {
        method: "POST",
        body: formData,
      });

      const responseData = await res.json();
      if (res.ok) {
        Alert.alert(
          "신고 성공",
          responseData.result || "신고가 성공적으로 등록되었습니다."
        );
        setPhoto(null);
        setDetail("");
        setDate(null);
        setLocation(null);
        setVisible(false);
        setModalType(null);

        navigation.navigate("UserTabNavigator", { screen: "MainScreen" });
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

  // --- Voice: start/stop + AI structuring ---
  const startRecording = async () => {
    try {
      setVoiceState("recording");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "마이크 권한을 허용해주세요.");
        setVoiceState("idle");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert("오류", "음성 녹음 시작에 실패했습니다.");
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

      const combinedDetail = `${result["공공기물 종류"] || ""} - ${
        result["발견된 문제 또는 점검 필요 사유"] || ""
      }`;
      setDetail(combinedDetail);

      if (typeof result["장소"] === "string") {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            result["장소"]
          )}&key=${googleMapsApiKey}`
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

  // 렌더
  return (
    <View style={styles.container}>
      {/* 뒤로가기 */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={30} color="#436D9D" />
      </TouchableOpacity>

      <Text style={styles.title}>공공기물 파손 등록</Text>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 음성 등록 */}
        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => {
            setModalType("voice");
            setVisible(true);
          }}
        >
          <Image source={require("./img/record_icon.png")} style={styles.recordIcon} />
          <Text style={styles.recordText}>AI 음성 등록 서비스</Text>
        </TouchableOpacity>

        {/* 사진 */}
        <Text style={styles.subtitle}>사진 등록</Text>
        <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.plusIcon}>＋</Text>}
        </TouchableOpacity>

        {/* 위치 선택 */}
        <TouchableOpacity
          style={styles.chooseButton}
          onPress={() => {
            setModalType("map");
            if (userLocation) {
              setTempSelectedLocation(userLocation); // GPS로 프리셋
              setVisible(true);
            } else {
              Alert.alert("위치 준비 중", "현재 위치를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
            }
          }}
        >
          <Text style={styles.submitText}>
            {location?.address
              ? location.address
              : location
              ? `위도 ${Number(location.lat).toFixed(4)}, 경도 ${Number(location.lng).toFixed(4)}`
              : "공공기물 위치 선택"}
          </Text>
        </TouchableOpacity>

        {/* 날짜 */}
        <TouchableOpacity
          style={styles.chooseButton}
          onPress={() => {
            setModalType("date");
            setVisible(true);
          }}
        >
          <Text style={styles.submitText}>{date || "날짜 선택"}</Text>
        </TouchableOpacity>

        {/* 상세 내용 */}
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

        {/* 제출 */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>등록하기</Text>}
        </TouchableOpacity>

        {/* 모달 */}
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {modalType === "map" && (
                <View style={{ flex: 1, height: 400 }}>
                  { (tempSelectedLocation || userLocation) ? (
                    <GoogleMapPicker
                      onLocationSelect={(data) => setTempSelectedLocation(data)}
                      initialCenter={
                        tempSelectedLocation
                          ? { lat: Number(tempSelectedLocation.lat), lng: Number(tempSelectedLocation.lng) }
                          : { lat: Number(userLocation.lat), lng: Number(userLocation.lng) }
                      }
                      initialZoom={16}
                      height={400}
                      // 좌표가 바뀌면 WebView를 재마운트해서 HTML/지도까지 새로 로드
                      key={`map-${tempSelectedLocation?.lat ?? userLocation?.lat}-${tempSelectedLocation?.lng ?? userLocation?.lng}-16`}
                    />
                  ) : (
                    <ActivityIndicator style={{ marginTop: 24 }} />
                  )}
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
                <ChooseDate
                  onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setVisible(false);
                  }}
                />
              )}

              {modalType === "voice" && (
                <View style={styles.voiceModal}>
                  {voiceState !== "processing" && (
                    <Text style={styles.voiceDescription}>AI 음성 등록 서비스</Text>
                  )}

                  {voiceState === "idle" && (
                    <>
                      <TouchableOpacity onPress={startRecording} style={styles.micButton}>
                        <Icon name="microphone-outline" size={100} color="white" />
                      </TouchableOpacity>
                      <Text style={styles.voiceDescription}>버튼을 눌러 녹음을 시작하세요.</Text>
                    </>
                  )}

                  {voiceState === "recording" && (
                    <>
                      <TouchableOpacity onPress={stopRecording} style={styles.micRecordingButton}>
                        <Icon name="microphone-outline" size={100} color="white" />
                      </TouchableOpacity>
                      <Text style={styles.voiceDescription}>녹음 중 입니다.</Text>
                    </>
                  )}

                  {voiceState === "processing" && (
                    <>
                      <Text style={styles.voiceDescription}>AI 구조화 중 입니다.</Text>
                      <ActivityIndicator size="large" color="#7ED8C2" style={{ transform: [{ scale: 4 }], marginTop: 50 }} />
                    </>
                  )}

                  <TouchableOpacity style={styles.voiceModalButton} onPress={() => setVisible(false)}>
                    <Text style={styles.voiceModalText}>닫기</Text>
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