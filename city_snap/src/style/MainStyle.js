import { StyleSheet } from 'react-native';

const shadow = {
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 7, // Android 전용
}

export const main_styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9F9F9",
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        color: "#2c3e50",
        marginBottom: 15,
        fontFamily: 'PretendardGOV-Bold',
    },
    button: {
        backgroundColor: "#436D9D",
        paddingVertical: 14,
        borderRadius: 20,
        alignItems: "center",
        marginBottom: 15,
        ...shadow,
    },
    buttonText: {
        fontSize: 17,
        color: "white",
        fontFamily: 'PretendardGOV-Bold',
    },
    mapBox: {
        backgroundColor: "#ECECEC",
        borderRadius: 40,
        alignItems: "center",
        padding: 10,
        ...shadow,
    },
    mapImage: {
        width: '90%',
        height: 280,
        marginBottom: 10,
    },
    mapLabel: {
        fontSize: 16,
        color: "#436D9D",
        fontFamily: 'PretendardGOV-Bold',
    },

    // 새로 추가: 신고 내역 카드 스타일
    reportBox: {
        backgroundColor: "#ECECEC",
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        marginTop:40, 
        marginBottom: 15,
        ...shadow,
    },
    reportImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginRight: 15,
    },
    reportTextContainer: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontFamily: "PretendardGOV-Bold",
        color: "#333",
        marginBottom: 5,
    },
    reportSubtitle: {
        fontSize: 14,
        color: "#666",
        fontFamily: "PretendardGOV-Regular",
    },

});