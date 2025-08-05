import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { main_styles } from "../style/MainStyle";
import NoticeBoardScreen from "./sub_contents/NoticeBoardScreen";

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
            </View>

            <View style={main_styles.section}>
                <Text style={main_styles.sectionTitle}>공지사항</Text>
                <NoticeBoardScreen />
            </View>
        </ScrollView>
    );
}

export default MainScreen;
