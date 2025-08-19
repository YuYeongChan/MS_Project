import { StyleSheet } from 'react-native';

const shadow = {
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
};

export const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#F9F9F9",
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        color: "#2c3e50",
        fontFamily: 'PretendardGOV-Bold',
        marginBottom: 10,
    },
    noticeBox: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadow,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    noticeTitle: {
        fontSize: 16,
        color: "black",
        fontFamily: 'PretendardGOV-Bold',
    },
    noticeDate: {
        fontSize: 12,
        color: "#888",
        fontFamily: 'PretendardGOV-Bold',
    },
    pageButtonArea: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 14,
        marginBottom: 30,
    },
    pageButton: {
        marginHorizontal: 10,
        padding: 8,
        backgroundColor: '#ECECEC',
        borderRadius: 8,
    },
    pageButtonText: {
        alignSelf: 'center',
        color: '#436D9D',
        fontFamily: 'PretendardGOV-Bold',
        fontSize: 15,
    },
    disabledText: {
        alignSelf: 'center',
        color: '#ccc',
        fontFamily: 'PretendardGOV-Bold',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '90%',
        height: '70%',
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 15,
        elevation: 10,
    },
    modalContentHeader: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 5,
    },
    modalTitle: {
        fontSize: 20,
        color: "#333",
        fontFamily: 'PretendardGOV-Bold',
    },
    modalDate: {
        fontSize: 12,
        fontFamily: 'PretendardGOV-Regular',
        color: "#999",
        marginBottom: 15,
        textAlign: 'right',
    },
    modalScrollView: {
        flex: 1,
    },
    modalContentText: {
        fontSize: 16,
        lineHeight: 24,
        color: "#555",
        fontFamily: 'PretendardGOV-Regular',
        paddingBottom: 20,
    },
    modalCloseIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
        zIndex: 1,
    },
    modalButtonRow: {
        flexDirection: 'row',
        marginTop: 20,
    },
    modalActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        ...shadow,
    },
    modalEditButton: {
        backgroundColor: '#5D8BFF',
        marginRight: 8,
    },
    modalDeleteButton: {
        backgroundColor: '#FF6B6B',
        marginLeft: 8,
    },
    writeContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9F9F9',
    },
    writeButton: {
        backgroundColor: '#436D9D',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    writeButtonText: {
        color: 'white',
        fontFamily: 'PretendardGOV-Bold',
        fontSize: 14,
    },
    inputField: {
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        fontSize: 16,
        marginBottom: 15,
        fontFamily: 'PretendardGOV-Regular',
    },
    contentField: {
        height: 200,
        textAlignVertical: 'top',
    },
    noticeTypeSelector: {
        marginTop: 20,
        width: '100%',
    },
    selectorLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        fontFamily: 'PretendardGOV-Bold',
    },
    typeButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    typeButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#fff',
    },
    typeButtonActive: {
        backgroundColor: '#436D9D',
        borderColor: '#436D9D',
    },
    typeButtonText: {
        fontSize: 14,
        color: '#555',
        fontFamily: 'PretendardGOV-Regular',
    },
    typeButtonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: 'PretendardGOV-Bold',
    },
    
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        backgroundColor: "#436D9D",
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        flex: 1,
    },
    cancelButton: {
        backgroundColor: '#888',
        marginRight: 10,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'PretendardGOV-Bold',
    },
});