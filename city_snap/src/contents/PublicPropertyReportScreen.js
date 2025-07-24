import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useState, useEffect } from "react";
import {
    Alert,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import KakaoMapPicker from "./sub_contents/KaKaoMapPicker";
import { styles } from "../style/PublicPropertyReportStyle";
import ChooseDate from "./sub_contents/ChooseDate";

// const API_BASE_URL = 'http://192.168.56.1:1234';
const API_BASE_URL = 'http://192.168.254.107:1234';

const PublicPropertyReportScreen = () => {
    const [photo, setPhoto] = useState(null);
    const [detail, setDetail] = useState("");
    const [visible, setVisible] = useState(false);
    const [date, setDate] = useState(null);
    const [location, setLocation] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);
    const [audioUri, setAudioUri] = useState(null);

    // 페이지가 열릴 때 오늘 날짜로 기본값 설정
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

    const handleLocation = (coords) => {
        setLocation(coords);
    };

    const handleSubmitReport = async () => {
        if (!photo || !location || !date || !detail.trim()) {
            Alert.alert("알림", "모든 필드를 입력해주세요.");
            return;
        }

        setIsLoading(true);

        const userId = await AsyncStorage.getItem('user_id');
        const token = await AsyncStorage.getItem('auth_token');
        if (!userId || !token) {
            Alert.alert("로그인 필요", "다시 로그인해주세요.");
            return;
        }

        const formData = new FormData();
        const filename = photo.split('/').pop();
        const fileExtension = filename.split('.').pop();
        const fileType = `image/${fileExtension.toLowerCase()}`;

        formData.append('photo', {
            uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
            name: filename,
            type: fileType,
        });
        formData.append('location_description', `위도: ${location.lat.toFixed(6)}, 경도: ${location.lng.toFixed(6)}`);
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
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
                Alert.alert("신고 성공", responseData.result);
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

    // 음성 녹음 시작
    const startRecording = async () => {
        try {
            // 권한 요청
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
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
            Alert.alert('오류', '음성 녹음 시작에 실패했습니다.');
            setIsRecording(false);
        }
    };

    // 음성 녹음 종료
    const stopRecording = async () => {
        try {
            if (!recording) return;
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setAudioUri(uri);
            setRecording(null);
            setIsRecording(false);
            Alert.alert('녹음 완료', `음성 파일이 저장되었습니다:\n${uri}`);
        } catch (err) {
            Alert.alert('오류', '음성 녹음 종료에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>

            <Text style={styles.title}>공공기물 파손 등록</Text>

            <TouchableOpacity
                style={styles.recordButton}
                onPress={() => {
                    setModalType("voice");
                    setVisible(true);
                }}
            >
                <Image
                    source={require('./img/record_icon.png')}
                    style={styles.recordIcon}
                />
                <Text style={styles.recordText}>AI 음성 등록 서비스</Text>
            </TouchableOpacity>

            <Text style={styles.subtitle}>사진 등록</Text>
            <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.photo}
                        onError={(e) => Alert.alert('오류', '이미지 불러오기 실패')} />
                ) : (
                    <Text style={styles.plusIcon}>＋</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseButton} onPress={() => {
                setModalType("map");
                setVisible(true);
            }}>
                <Text style={styles.submitText}>
                    {location ? `위도 ${location.lat.toFixed(4)}, 경도 ${location.lng.toFixed(4)}` : "공공기물 위치 선택"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseButton} onPress={() => {
                setModalType("date");
                setVisible(true);
            }}>
                <Text style={styles.submitText}>{date || "날짜 선택"}</Text>
            </TouchableOpacity>

            <View style={styles.viewStyle}>
                <Text style={styles.viewTitle}>상세 내용</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="파손 내용을 입력하세요"
                    placeholderTextColor="#777"
                    value={detail}
                    onChangeText={setDetail}
                    multiline
                />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport} disabled={isLoading}>
                <Text style={styles.submitText}>{isLoading ? "등록 중..." : "등록하기"}</Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {modalType === "map" && (
                            <>
                                <KakaoMapPicker style={styles.modalMap} onLocationSelect={handleLocation} />
                                <TouchableOpacity style={styles.modalButton} onPress={() => setVisible(false)}>
                                    <Text style={styles.submitText}>위치 선택 완료</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {modalType === "date" && (
                            <ChooseDate onSelect={(selectedDate) => {
                                setDate(selectedDate);
                                setVisible(false);
                            }} />
                        )}
                        {modalType === "voice" && (
                            <View style={styles.voiceModal}>
                                <Text style={styles.voiceTitle}>AI 음성 등록 서비스</Text>
                                <Text style={styles.voiceDescription}>음성으로 공공기물 파손 내용을 등록하세요.</Text>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={isRecording ? stopRecording : startRecording}
                                >
                                    <Text style={styles.submitText}>
                                        {isRecording ? "녹음 종료" : "음성 녹음 시작"}
                                    </Text>
                                </TouchableOpacity>
                                {audioUri && (
                                    <Text style={{ marginTop: 10, color: '#333', fontSize: 12 }}>
                                        파일 저장 위치: {audioUri}
                                    </Text>
                                )}
                                <TouchableOpacity
                                    style={[styles.modalButton, { marginTop: 10 }]}
                                    onPress={() => setVisible(false)}
                                >
                                    <Text style={styles.submitText}>닫기</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default PublicPropertyReportScreen;