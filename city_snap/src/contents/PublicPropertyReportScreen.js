import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    Alert, // Alert 임포트 추가
    Button, // 사용되지 않지만 원본에 있었음. 필요시 제거.
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform, // Platform 임포트 추가 (파일 URI 처리용)
} from "react-native";
import KakaoMapPicker from "./sub_contents/KaKaoMapPicker";
import { styles } from "../style/PublicPropertyReportStyle";

import ChooseDate from "./sub_contents/ChooseDate"; // 날짜 선택 컴포넌트 임포트


// --- 중요: Python FastAPI 서버의 기본 URL 설정 ---
// SignUpScreen.js와 동일한 IP 주소 및 포트로 설정해야 합니다.
const API_BASE_URL = 'http://192.168.56.1:1234'; 

const PublicPropertyReportScreen = () => {
    const [photo, setPhoto] = useState(null); // 신고 사진 URI
    const [detail, setDetail] = useState(""); // 파손 상세 내용
    const [visible, setVisible] = useState(false); // 모달(팝업) 표시 여부 (지도/날짜 겸용)

    const [date, setDate] = useState(null); // 선택된 날짜 (YYYY/MM/DD 형식)
    const [location, setLocation] = useState(null); // 선택된 위치 {lat, lng}
    const [modalType, setModalType] = useState(null); // 현재 모달 타입 ('map' 또는 'date')
    const [isLoading, setIsLoading] = useState(false); // API 호출 중 로딩 상태

    // 사진 선택 함수
    const pickPhoto = async () => {
        // 권한 요청 추가
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다. 설정에서 허용해주세요.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // 현재 작동하는 방식 사용
            allowsEditing: true,
            quality: 1, // 이미지 품질
        });
        
        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    // 지도에서 위치 선택 시 호출되는 콜백 함수
    const handleLocation = (coords) => {
        setLocation(coords);
    };

    // --- 신고 등록 버튼 클릭 시 호출될 함수 (FastAPI 연결) ---
    const handleSubmitReport = async () => {
        // 1. 필수 입력 필드 유효성 검사
        if (!photo) {
            Alert.alert("알림", "사진을 등록해주세요.");
            return;
        }
        if (!location) {
            Alert.alert("알림", "공공기물 위치를 선택해주세요.");
            return;
        }
        if (!date) {
            Alert.alert("알림", "날짜를 선택해주세요.");
            return;
        }
        if (!detail.trim()) {
            Alert.alert("알림", "파손 내용을 입력해주세요.");
            return;
        }

        setIsLoading(true); // 로딩 상태 시작

        // 2. FormData 객체 생성
        const formData = new FormData();
        
        // --- 사진 파일 추가 ---
        const filename = photo.split('/').pop();
        const fileExtension = filename.split('.').pop();
        const fileType = `image/${fileExtension.toLowerCase()}`;

        formData.append('photo', { // 백엔드에서 'photo'로 받도록 설정 (RegistrationDAO)
            uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
            name: filename,
            type: fileType,
        });

        // --- 다른 텍스트 필드 추가 (FastAPI 엔드포인트 파라미터 이름과 일치) ---
        formData.append('location_description', `위도: ${location.lat.toFixed(6)}, 경도: ${location.lng.toFixed(6)}`);
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
        formData.append('report_date', date); // YYYY/MM/DD 형식 (ChooseDate에서 반환)
        formData.append('details', detail);
        formData.append('user_id', 'user_test_01'); // 실제 앱에서는 로그인된 사용자 ID를 사용해야 합니다. (임시값)

        try {
            const response = await fetch(`${API_BASE_URL}/registration.write`, { // FastAPI 엔드포인트
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data', // FormData 사용 시 필수
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) { // HTTP 상태 코드가 2xx (성공)인 경우
                Alert.alert("신고 성공", responseData.result || "공공기물 파손 신고가 성공적으로 등록되었습니다!");
                // 성공 후 입력 필드 초기화
                setPhoto(null);
                setDetail("");
                setDate(null);
                setLocation(null);
                setVisible(false);
                setModalType(null);
            } else {
                console.error("서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                Alert.alert("신고 실패", responseData.error || responseData.result || "신고 등록에 실패했습니다. 다시 시도해주세요.");
            }
        } catch (error) {
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false); // 로딩 상태 종료
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>공공기물 파손 등록</Text>

            {/* 사진 등록 */}
            <Text style={styles.subtitle}>사진 등록</Text>
            <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.photo} 
                    onError={(e) => {
                        console.log('이미지 로딩 실패:', e.nativeEvent.error);
                        Alert.alert('오류', '이미지를 불러올 수 없습니다');
                    }}/>
                ) : (
                    <Text style={styles.plusIcon}>＋</Text>
                )}
            </TouchableOpacity>

            {/* 공공기물 위치 */}
            <TouchableOpacity
                style={styles.chooseButton}
                onPress={() => {
                    setModalType("map");
                    setVisible(true);
                }}
            >
                <Text style={styles.submitText}>
                    {location ? `위치 선택 완료: 위도 ${location.lat.toFixed(4)}, 경도 ${location.lng.toFixed(4)}` : "공공기물 위치 선택"}
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
                <Text style={styles.submitText}>
                    {date || "날짜 선택"}
                </Text>
            </TouchableOpacity>

            {/* 파손 내용 */}
            <View
                style={styles.viewStyle}
            >
                <Text
                    style={styles.viewTitle}
                >
                    상세 내용
                </Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="파손된 공공기물에 대해 자세히 입력해 주세요!"
                    placeholderTextColor="#777"
                    value={detail}
                    onChangeText={setDetail}
                    multiline
                />
            </View>

            {/* 등록 버튼 */}
            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitReport} // handleSubmitReport 함수와 연결
                disabled={isLoading} // 로딩 중 버튼 비활성화
            >
                <Text style={styles.submitText}>{isLoading ? "등록 중..." : "등록하기"}</Text>
            </TouchableOpacity>

            {/* 팝업창 (모달) */}
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {modalType === "map" && (
                            <>
                                <KakaoMapPicker style={styles.modalMap} onLocationSelect={handleLocation} />
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setVisible(false)}
                                >
                                    <Text style={styles.submitText}>위치 선택 완료</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {modalType === "date" && (
                            // ChooseDate 컴포넌트가 날짜 선택과 모달 닫기 기능을 모두 처리한다고 가정
                            <ChooseDate
                                onSelect={(selectedDate) => {
                                    setDate(selectedDate);
                                    setVisible(false); // 날짜 선택 후 모달 닫기
                                }}
                                // ChooseDate 컴포넌트에 현재 선택된 날짜를 전달하여 초기값 설정
                                // currentSelectedDate={date} 
                                // ChooseDate 컴포넌트가 자체 닫기 버튼을 가진다면 onClose prop을 전달
                                // onClose={() => setVisible(false)}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default PublicPropertyReportScreen;