import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    Button,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import KakaoMapPicker from "./sub_contents/KaKaoMapPicker";
import { styles } from "../style/PublicPropertyReportStyle";

import ChooseDate from "./sub_contents/ChooseDate";


const PublicPropertyReportScreen = () => {
    const [photo, setPhoto] = useState(null);
    const [detail, setDetail] = useState("");
    const [visible, setVisible] = useState(false);

    const [date, setDate] = useState(null);
    const [modalType, setModalType] = useState(null);
    
    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
        });
        
        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const [location, setLocation] = useState(null);

    const handleLocation = (coords) => {
        setLocation(coords);
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
                        alert('이미지를 불러올 수 없습니다');
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
                <Text style={styles.submitText}>공공기물 위치</Text>
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
                onPress={() => alert("등록 완료")}
            >
                <Text style={styles.submitText}>등록하기</Text>
            </TouchableOpacity>

            {/* 팝업창 이벤트 */}
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
                                    <Text style={styles.submitText}>위치 선택</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {modalType === "date" && (
                            <>
                                <ChooseDate
                                    onSelect={(selectedDate) => {
                                        setDate(selectedDate);
                                        setVisible(false);
                                    }}
                                />
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default PublicPropertyReportScreen;