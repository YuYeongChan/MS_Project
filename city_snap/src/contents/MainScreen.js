import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { main_styles } from "../style/MainStyle";
import NoticeBoardScreen from "./NoticeBoardScreen";

function MainScreen() {
    const navigation = useNavigation();

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={main_styles.container}
            nestedScrollEnabled={true}
        >
            <View style={main_styles.section}>
                <Text style={main_styles.sectionTitle}>파손 등록 및 조회</Text>
                <TouchableOpacity
                    style={main_styles.button}
                    onPress={() => navigation.navigate("PublicPropertyReportScreen")}
                >
                    <Text style={main_styles.buttonText}>공공기물 파손 등록</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={main_styles.mapBox}
                    onPress={() => navigation.navigate("DamageMapScreen")}
                >
                    <Text style={main_styles.mapLabel}>공공기물 파손 현황 지도</Text>
                    <Image
                        source={require('./img/map_img.png')}
                        style={main_styles.mapImage}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={main_styles.reportBox}
                    onPress={() => navigation.navigate("MyReportsScreen")}
                >
                    <Image
                        source={require('./img/problemReport.png')} // 신고 관련 아이콘 이미지 추가 필요
                        style={main_styles.reportImage}
                    />
                    <View style={main_styles.reportTextContainer}>
                        <Text style={main_styles.reportTitle}>내 신고 내역 보기</Text>
                        <Text style={main_styles.reportSubtitle}>
                            내가 신고한 공공기물 파손 내역을 확인하세요
                        </Text>
                    </View>
                </TouchableOpacity>
                



            </View>
        </ScrollView>
    );
}

export default MainScreen;
