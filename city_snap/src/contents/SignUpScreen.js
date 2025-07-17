import React, { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
    ScrollView, // 내용이 길어질 수 있으므로 ScrollView 추가
    Platform, // 전화번호 입력 시 키보드 타입 변경 위함
} from "react-native";

// --- 중요: Python FastAPI 서버의 기본 URL 설정 ---
// const API_BASE_URL = 'http://YOUR_PYTHON_SERVER_IP:8000'; 
const API_BASE_URL = 'http://195.168.9.69:1234'; 
// 예: 'http://192.168.1.100:1234' (FastAPI가 1234 포트에서 실행 중일 경우)


const SignUpScreen = ({ navigation }) => {
    // Users 테이블 스키마에 맞춰 상태 변수 추가/조정
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    // const [profilePicUrl, setProfilePicUrl] = useState(""); // 프로필 사진은 보통 파일 업로드로 처리되므로, 필요시 활성화
    const [nickname, setNickname] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState(""); // phone_number 필드 추가
    const [address, setAddress] = useState("");
    const [residentIdNumber, setResidentIdNumber] = useState("");
    // score 필드는 서버에서 기본값 처리하거나 앱 로직에서 관리하므로 클라이언트에서 직접 입력받지 않음

    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        // 1. 입력 필드 유효성 검사 (필수 필드 확인)
        // Users 테이블의 NOT NULL 필드: user_no, user_id, password, nickname, name, resident_id_number
        if (!userId.trim() || !password.trim() || !nickname.trim() || 
            !name.trim() || !residentIdNumber.trim()) {
            Alert.alert("알림", "필수 입력 필드(사용자 ID, 비밀번호, 닉네임, 이름, 주민등록번호)를 모두 입력해주세요.");
            return;
        }

        setIsLoading(true);

        // 2. FormData 객체 생성
        const formData = new FormData();
        // FastAPI 백엔드의 account.sign.up 함수 파라미터 이름과 일치해야 합니다.
        // homeController.py의 accountSignUp 함수 정의를 다시 확인하세요:
        // user_id, password, nickname, name, address, resident_id_number
        // (phone_number는 현재 FastAPI 엔드포인트에 없음. 필요시 백엔드도 수정해야 함)
        
        formData.append('user_id', userId);
        formData.append('password', password);
        // if (profilePicUrl) formData.append('profile_pic_url', profilePicUrl); // 프로필 사진 URL 필드
        formData.append('nickname', nickname);
        formData.append('name', name);
        formData.append('address', address); // null 허용 필드이므로 빈 문자열도 가능
        formData.append('resident_id_number', residentIdNumber);
        // phone_number도 백엔드에서 받으려면 formData에 추가하고 FastAPI 엔드포인트 수정 필요
        // if (phoneNumber) formData.append('phone_number', phoneNumber); 


        try {
            // 3. FastAPI 서버로 HTTP POST 요청 보내기
            const response = await fetch(`${API_BASE_URL}/account.sign.up`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    // FormData 사용 시 'Content-Type': 'multipart/form-data'는 fetch가 자동으로 설정
                },
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok) { // HTTP 상태 코드가 2xx (성공)인 경우
                Alert.alert("회원가입 성공", responseData.result || "회원가입에 성공했습니다!");
                console.log("회원가입 성공 데이터:", responseData);
                
                // 회원가입 성공 후 로그인 화면으로 돌아가기
                navigation.goBack(); 

            } else {
                console.error("회원가입 서버 응답 오류 (상태 코드:", response.status, "):", responseData);
                // 서버에서 보낸 에러 메시지를 사용자에게 표시
                Alert.alert("회원가입 실패", responseData.error || responseData.result || "회원가입에 실패했습니다. 다시 시도해주세요.");
            }
        } catch (error) {
            console.error("네트워크 요청 실패:", error);
            Alert.alert("오류", "서버와 통신하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        } finally {
            setIsLoading(false); // 로딩 종료
        }
    };

    return (
        <ScrollView contentContainerStyle={signUpStyles.scrollContainer}>
            <View style={signUpStyles.container}>
                <Text style={signUpStyles.title}>회원가입</Text>

                <TextInput
                    style={signUpStyles.input}
                    placeholder="사용자 ID /email"
                    placeholderTextColor="#999"
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="none" // 대문자 자동 변환 방지
                    keyboardType="email-address" // ID가 이메일 형식일 경우 유용
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="비밀번호"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry // 비밀번호 숨김
                />
                {/* 프로필 사진 URL은 보통 이미지 업로드 로직이 필요하므로 현재는 주석 처리 */}
                {/*
                <TextInput
                    style={signUpStyles.input}
                    placeholder="프로필 사진 URL (선택 사항)"
                    placeholderTextColor="#999"
                    value={profilePicUrl}
                    onChangeText={setProfilePicUrl}
                />
                */}
                <TextInput
                    style={signUpStyles.input}
                    placeholder="닉네임"
                    placeholderTextColor="#999"
                    value={nickname}
                    onChangeText={setNickname}
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="이름"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="전화번호 (선택 사항, 예: 010-1234-5678)"
                    placeholderTextColor="#999"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad" // 전화번호 키보드
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="주소 (선택 사항)"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                />
                <TextInput
                    style={signUpStyles.input}
                    placeholder="주민등록번호 (필수, 예: 123456-1234567)"
                    placeholderTextColor="#999"
                    value={residentIdNumber}
                    onChangeText={setResidentIdNumber}
                    keyboardType="numeric" // 숫자 키보드
                    maxLength={14} // '123456-1234567'에 맞춰 14자 제한
                />

                <TouchableOpacity
                    style={signUpStyles.signupButton}
                    onPress={handleSignUp}
                    disabled={isLoading}
                >
                    <Text style={signUpStyles.buttonText}>{isLoading ? "가입 중..." : "회원가입"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={signUpStyles.backToLoginButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={signUpStyles.backToLoginText}>로그인 화면으로 돌아가기</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// --- 회원가입 화면을 위한 스타일 (기존과 동일하게 유지) ---
const signUpStyles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1, // ScrollView의 콘텐츠가 스크롤 가능하도록
        justifyContent: 'center', // 컨테이너 내용을 중앙 정렬
        paddingVertical: 30, // 상하 패딩을 약간 줄여서 화면 상하 여백 확보
        backgroundColor: '#7145C9', // 전체 배경색
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: '#7145C9', // ScrollContainer에서 배경색을 이미 설정했으므로 여기서 제거 가능
        paddingHorizontal: 25, // 좌우 패딩을 조금 더 주고, 입력 필드의 width와 조화
    },
    title: {
        fontSize: 30, // 글꼴 크기를 약간 줄여서 안정감 있게
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 30, // 제목과 첫 번째 입력 필드 사이 간격 증가
    },
    input: {
        width: '100%', // 너비를 90%에서 100%로 늘려서 좌우 패딩과 조화롭게
        backgroundColor: '#fff',
        paddingVertical: 14, // 상하 패딩 증가
        paddingHorizontal: 18, // 좌우 패딩 증가
        borderRadius: 10,
        marginBottom: 12, // 입력 필드 간 간격 약간 줄임
        fontSize: 16, // 입력 텍스트 글꼴 크기
        color: '#333',
        borderWidth: 1, // 테두리 추가
        borderColor: '#ddd', // 테두리 색상
    },
    signupButton: {
        width: '100%', // 너비를 90%에서 100%로 늘려서 입력 필드와 일관성 유지
        backgroundColor: '#945EE2',
        paddingVertical: 16, // 버튼 상하 패딩 증가
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20, // 위쪽 마진 증가
        marginBottom: 10, // 아래쪽 마진 추가
    },
    buttonText: {
        color: 'white',
        fontSize: 18, // 글꼴 크기 유지
        fontWeight: 'bold',
    },
    backToLoginButton: {
        marginTop: 15, // 위쪽 마진 조정
        paddingVertical: 10, // 상하 패딩
        paddingHorizontal: 20, // 좌우 패딩 (터치 영역 확보)
    },
    backToLoginText: {
        color: '#ADD8E6',
        fontSize: 15, // 글꼴 크기를 약간 줄여서 주 버튼과 차이
        textDecorationLine: 'underline',
    },
});

export default SignUpScreen;
