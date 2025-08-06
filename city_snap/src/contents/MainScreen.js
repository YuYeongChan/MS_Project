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
            </View>
        </ScrollView>
    );
}

export default MainScreen;
