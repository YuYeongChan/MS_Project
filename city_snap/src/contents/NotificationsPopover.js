import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { GestureHandlerRootView, FlatList as GHFlatList } from "react-native-gesture-handler";
import Ionicons from "react-native-vector-icons/Ionicons";
import { apiFetch } from "../auth/api";
import { getTokens } from "../auth/authStorage";
import jwt_decode from "jwt-decode";

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 260;

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
      {/* Modal은 독립 트리라 제스처 루트를 다시 만들어줘야 함 */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={S.overlay} pointerEvents="box-none">
          <View
            style={[S.card, { width: POPUP_WIDTH, height: POPUP_HEIGHT }]}
            onStartShouldSetResponderCapture={() => false}
          >
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

            {/* 콘텐츠: 고정 높이 내부만 스크롤 */}
            {loading ? (
              <View style={S.center}><ActivityIndicator /></View>
            ) : (
              <GHFlatList
                data={items}
                keyExtractor={(it, idx) => String(it.notification_id ?? idx)}
                style={S.list}
                contentContainerStyle={S.listContent}
                ItemSeparatorComponent={() => <View style={S.sep} />}
                ListEmptyComponent={
                  <View style={S.empty}><Text style={{ color: "#666" }}>알림이 없습니다.</Text></View>
                }
                renderItem={({ item }) => (
                  <View style={S.item}>
                    <Text style={S.content}>{item.content}</Text>
                    <Text style={S.meta}>{item.sent_at || ""}</Text>
                  </View>
                )}
                nestedScrollEnabled
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator
                scrollEventThrottle={16}
                bounces
              />
            )}
          </View>
        </View>
      </GestureHandlerRootView>
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

  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  sep: { height: 1, backgroundColor: "#eee" },
  item: { paddingVertical: 10 },
  content: { fontSize: 14, color: "#222", marginBottom: 4, lineHeight: 20 },
  meta: { fontSize: 12, color: "#7a7a7a" },

  empty: { paddingVertical: 24, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});