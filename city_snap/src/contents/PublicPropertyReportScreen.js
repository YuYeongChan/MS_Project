
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
    ActivityIndicator, // 로딩 인디케이터를 위해 추가
} from "react-native";
// KakaoMapPicker 대신 GoogleMapPicker를 import 합니다.
import GoogleMapPicker from "./sub_contents/KaKaoMapPicker"; // 경로를 정확히 확인해주세요.
import ChooseDate from "./sub_contents/ChooseDate";
import { styles } from "../style/PublicPropertyReportStyle";
import { API_BASE_URL } from '../utils/config';

const PublicPropertyReportScreen = () => {
    const [photo, setPhoto] = useState(null);
    const [detail, setDetail] = useState("");
    const [visible, setVisible] = useState(false);
    const [date, setDate] = useState(null);
    // location 상태에 address 필드를 추가합니다.
    const [location, setLocation] = useState(null); // { lat: number, lng: number, address: string } 형태 예상
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

    //  handleLocation 함수가 이제 주소 정보도 함께 받습니다.
    const handleLocation = (coords) => {
        // coords는 { lat, lng, address } 형태일 것으로 예상됩니다.
        setLocation(coords);
        setVisible(false); // 위치 선택 후 모달 닫기
    };

    const handleSubmitReport = async () => {
        //  location.address가 있는지 확인하는 조건 추가
        if (!photo || !location || !location.lat || !location.lng || !location.address || !date || !detail.trim()) {
            Alert.alert("알림", "모든 필드를 입력해주세요. (위치 및 주소 포함)");
            return;
        }

        setIsLoading(true);

        const userId = await AsyncStorage.getItem('user_id');
        const token = await AsyncStorage.getItem('auth_token');
        if (!userId || !token) {
            Alert.alert("로그인 필요", "다시 로그인해주세요.");
            setIsLoading(false); // 로딩 상태 해제
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
        //  location_description에 주소 정보 포함
        formData.append('location_description', `${location.address} (위도: ${location.lat.toFixed(6)}, 경도: ${location.lng.toFixed(6)})`);
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
        //  새로운 필드: address (서버에서 이 필드를 받는다고 가정)
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
                // 성공 시 상태 초기화
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
                {/* ✅ location.address를 우선적으로 표시하도록 변경 */}
                <Text style={styles.submitText}>
                    {location && location.address
                        ? location.address
                        : location // 주소는 없지만 위경도는 있을 경우 (오류 대비)
                        ? `위도 ${location.lat.toFixed(4)}, 경도 ${location.lng.toFixed(4)}`
                        : "공공기물 위치 선택"
                    }
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
                {isLoading ? (
                    <ActivityIndicator color="#fff" /> // 로딩 중일 때 인디케이터 표시
                ) : (
                    <Text style={styles.submitText}>등록하기</Text>
                )}
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {modalType === "map" && (
                            // ✅ KakaoMapPicker 대신 GoogleMapPicker 사용
                            <GoogleMapPicker style={styles.modalMap} onLocationSelect={handleLocation} />
                            // 위치 선택 완료 버튼은 handleLocation 내부에서 모달을 닫으므로 필요 없습니다.
                            // 만약 사용자가 지도를 선택하지 않고 닫기만 원한다면 추가할 수 있습니다.
                            // <TouchableOpacity style={styles.modalButton} onPress={() => setVisible(false)}>
                            //     <Text style={styles.submitText}>닫기</Text>
                            // </TouchableOpacity>
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