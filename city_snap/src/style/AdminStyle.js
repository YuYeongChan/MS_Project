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
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4F4F4",
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: "#555",
        marginBottom: 30,
    },
    button: {
        width: "80%",
        backgroundColor: "#436D9D",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 15,
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
    logoutButton: {
        marginTop: 30,
        padding: 12,
    },
    logoutText: {
        color: "#D9534F",
        fontSize: 16,
        fontWeight: "600",
    },


});