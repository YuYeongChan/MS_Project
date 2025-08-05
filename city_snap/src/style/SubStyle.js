import { StyleSheet } from 'react-native';

const shadow = {
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 7,
}

export const notice_style = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9F9F9",
        height: 300,
    },
    noticeBox: {
        backgroundColor: "#ECECEC",
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadow,
    },
    noticeTitle: {
        fontSize: 18,
        color: "black",
        fontFamily: 'PretendardGOV-Bold',
        marginLeft: 10,
    },
    noticeDate: {
        fontSize: 13,
        color: "#888",
        marginBottom: 8,
    },
    noticeContent: {
        fontSize: 15,
        color: "#222",
    },
    emptyText: {
        textAlign: "center",
        color: "#888",
        fontSize: 16,
        fontFamily: 'PretendardGOV-Regular',
        marginTop: 40,
    },
    list: {
        borderColor: "#CBCDD3",
        borderWidth: 2,
        borderRadius: 16,
        padding: 20,
        height: 300,
    }
});
