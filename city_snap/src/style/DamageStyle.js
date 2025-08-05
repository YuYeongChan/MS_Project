import { StyleSheet } from 'react-native';

const shadow = {
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 7, // Android 전용
}

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9F9F9",
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        color: "#436D9D",
        marginBottom: 15,
        fontFamily: 'PretendardGOV-ExtraBold',
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
        marginBottom: 30,
        ...shadow,
    },
    mapImage: {
        width: '90%',
        height: 300,
        marginBottom: 10,
    },
    mapLabel: {
        fontSize: 16,
        color: "#436D9D",
        fontFamily: 'PretendardGOV-Bold',
    },
});