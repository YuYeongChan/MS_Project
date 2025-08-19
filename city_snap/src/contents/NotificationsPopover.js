import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { apiFetch } from "../auth/api";
import { getTokens } from "../auth/authStorage";
import jwt_decode from "jwt-decode";

const POPUP_WIDTH = 360;  // 고정 폭
const POPUP_HEIGHT = 260; // 고정 높이 (원하는 값으로 변경)

export default function NotificationsPopover({ visible, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { access } = await getTokens();
      let qs = "?limit=20";
      if (access) {
        try {
          const payload = jwt_decode(access);
          const userId = payload?.user_id;
          if (userId) qs = `?recipient_code=${encodeURIComponent(userId)}&limit=20`;
        } catch {}
      }
      const res = await apiFetch(`/notifications${qs}`, { method: "GET" });
      const data = await res.json();
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (e) {
      console.warn("알림 조회 실패:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 배경 눌러도 안 닫히게 고정하려면 onPress 제거, 배경 눌러 닫히게 하려면 onPress={onClose} 추가 */}
      <TouchableWithoutFeedback /* onPress={onClose} */>
        <View style={S.overlay}>
          <TouchableWithoutFeedback>
            <View style={[S.card, { width: POPUP_WIDTH, height: POPUP_HEIGHT }]}>
              {/* 헤더 */}
              <View style={S.header}>
                <Text style={S.title}>알림</Text>
                <View style={S.headerActions}>
                  <TouchableOpacity onPress={load} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="refresh" size={18} color="#436D9D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 컨텐츠: 고정 높이 내에서만 스크롤 */}
              {loading ? (
                <View style={S.center}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(it, idx) => String(it.notification_id ?? idx)}
                  style={S.list}                       // flex:1 로 카드 안에서만 스크롤
                  contentContainerStyle={S.listContent}
                  ItemSeparatorComponent={() => <View style={S.sep} />}
                  ListEmptyComponent={
                    <View style={S.empty}>
                      <Text style={{ color: "#666" }}>알림이 없습니다.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={S.item}>
                      {/* 내용이 길면 줄바꿈되며, 영역은 리스트가 스크롤로 해결 */}
                      <Text style={S.content}>{item.content}</Text>
                      <Text style={S.meta}>
                        {(item.sent_at || "")}
                      </Text>
                    </View>
                  )}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  initialNumToRender={12}
                />
              )}

              {/* 푸터 */}
              
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingTop: Platform.select({ ios: 50, android: 40 }),
    paddingRight: 10,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#222" },

  list: { flex: 1 },                 // 고정 높이 내에서 차지하고 스크롤
  listContent: { paddingBottom: 8 },
  sep: { height: 1, backgroundColor: "#eee" },
  item: { paddingVertical: 10 },
  content: { fontSize: 14, color: "#222", marginBottom: 4, lineHeight: 20 },
  meta: { fontSize: 12, color: "#7a7a7a" },

  empty: { paddingVertical: 24, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  footerCloseBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  footerCloseText: { color: "#436D9D", fontWeight: "600", fontSize: 13 },
});