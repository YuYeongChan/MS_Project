import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { main_styles } from "../style/MainStyle";

function MainScreen() {
    const navigation = useNavigation();

    return (
        <View style={main_styles.container}>
            {/* Title */}
            <Text style={main_styles.title}>City Snap</Text>

            {/* Damage Section */}
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
                    // onPress={() => navigation.navigate("DamageMapScreen")}
                    onPress={() => {alert("파손 현황 지도")}}
                >
                    <Text style={main_styles.mapLabel}>공공기물 파손 현황 지도</Text>
                    <Image
                        source={require('./img/map_img.png')}
                        style={main_styles.mapImage}
                    />
                </TouchableOpacity>
            </View>

            {/* User Info Section */}
            <View style={main_styles.section}>
                <Text style={main_styles.sectionTitle}>내 정보 조회 및 설정</Text>

                {/* Icons */}
                <View style={main_styles.iconRow}>
                    <TouchableOpacity
                        style={main_styles.icon}
                        // onPress={() =>
                        //     navigation.navigate("ScoreScreen")
                        // }
                        onPress={() => {alert("내 순위 조회")}}
                    >
                        <Text style={main_styles.scoreLabel}>내 점수</Text>
                        <View style={main_styles.scoreView}>
                            <Text style={main_styles.scoreValue}>120</Text>
                            <Text style={main_styles.scoreRank}>237등</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={main_styles.icon}
                        onPress={() =>
                            navigation.navigate("AccountScreen")
                        }
                        // onPress={() => {alert("내 정보 조회")}}
                    >
                        <Text style={main_styles.iconText}>내 정보</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={main_styles.icon}
                        // onPress={() =>
                        //     navigation.navigate("NotificationScreen")
                        // }
                        onPress={() => {alert("알림 조회")}}
                    >
                        <Text style={main_styles.iconText}>알림</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={main_styles.icon}
                        // onPress={() => navigation.navigate("SettingsScreen")}
                        onPress={() => {alert("앱 설정")}}
                    >
                        <Text style={main_styles.iconText}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export default MainScreen;
