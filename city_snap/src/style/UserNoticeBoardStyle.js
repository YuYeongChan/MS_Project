import { StyleSheet } from 'react-native';

const shadow = {
  shadowColor: 'black',
  shadowOffset: { width: 10, height: 10 },
  shadowOpacity: 0.8,
  shadowRadius: 20,
  elevation: 7,
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingTop: 10,
    paddingHorizontal: 20,
  },

  // 리스트
  title: {
    fontSize: 18,
    color: "#436D9D",
    fontFamily: 'PretendardGOV-Bold',
    marginBottom: 10,
  },
  fixedNotices: { marginBottom: 18 },
  noticeBox: {
    backgroundColor: "#ECECEC",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    color: "black",
    fontFamily: 'PretendardGOV-Bold',
    marginLeft: 10,
  },
  noticeDate: {
    fontSize: 12,
    color: "#888",
    marginLeft: 'auto',
    fontFamily: 'PretendardGOV-Bold',
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 16,
    fontFamily: 'PretendardGOV-Regular',
    marginTop: 40,
  },

  // 페이지네이션
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
    color: '#bbb',
    fontFamily: 'PretendardGOV-Bold',
    fontSize: 15,
  },

  // 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    maxHeight: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 10,
    height: '70%',
    position: 'relative', // 닫기 버튼 기준
  },
  modalContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cacacaff',
    borderTopWidth: 1,
    borderTopColor: '#cacacaff',
    height: 50,
  },
  modalTitle: {
    fontSize: 18,
    color: "#436D9D",
    fontFamily: 'PretendardGOV-Bold',
    marginLeft: 5,
  },
  modalDate: {
    fontSize: 12,
    fontFamily: 'PretendardGOV-Bold',
    color: "#888",
    marginTop: 8,
  },
  modalAdmin: {
    fontSize: 14,
    color: "#888",
    fontFamily: 'PretendardGOV-Regular',
    marginTop: 5,
  },
  modalContentText: {
    fontSize: 15,
    color: "#222",
    marginTop: 10,
    fontFamily: 'PretendardGOV-Regular',
  },

  // 닫기 버튼 (작게, 우하단 고정)
  modalCloseButton: {
    backgroundColor: "#436D9D",
    borderRadius: 20,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 20,
    right: 20,
    ...shadow,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'PretendardGOV-Bold',
  },
});