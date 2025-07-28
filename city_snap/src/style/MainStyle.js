import { StyleSheet } from 'react-native';

const shadow = {
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10, // Android 전용
}

export const main_styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#7145C9",
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        color: "white",
        textAlign: "center",
        marginBottom: 30,
        fontWeight: "bold",
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        color: "white",
        marginBottom: 15,
        fontWeight: "bold",
    },
    button: {
        backgroundColor: "#945EE2",
        paddingVertical: 14,
        borderRadius: 20,
        alignItems: "center",
        marginBottom: 15,
        ...shadow,
    },
    buttonText: {
        fontSize: 16,
        color: "white",
        fontWeight: "bold",
    },
    mapBox: {
        backgroundColor: "white",
        borderRadius: 20,
        alignItems: "center",
        padding: 10,
        ...shadow,
    },
    mapImage: {
        width: '90%',
        height: 150,
        marginBottom: 10,
    },
    mapLabel: {
        fontSize: 16,
        color: "#945EE2",
        fontWeight: "bold",
    },
    scoreView: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    scoreLabel: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        marginRight: '50%',
        marginBottom: 10
    },
    scoreValue: {
        fontSize: 28,
        color: "white",
        fontWeight: "bold",
    },
    scoreRank: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
    },
    iconRow: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: '6%',
        marginTop: 10,
    },
    icon: {
        backgroundColor: "#945EE2",
        padding: 12,
        borderRadius: 20,
        width: '47%',
        height: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...shadow,
    },
    iconText: {
        color: "white",
        fontSize: 23,
        fontWeight: "bold",
    },
});