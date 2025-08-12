import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwt_decode from "jwt-decode";
import { API_BASE_URL } from "../../utils/config";
import { useFocusEffect } from "@react-navigation/native";
import { styles as listStyles } from "../../style/RankingStyle";

// ---------- 유틸 ----------
const cleanStr = (v) => {
  if (v === null || v === undefined) return "";
  // 양끝 공백, 양끝 큰따옴표 제거, 탭/개행 제거
  return String(v).replace(/[\t\r\n]/g, "").replace(/^"+|"+$/g, "").trim();
};

// 파일명이 다양하게 올 때도 안전하게 아바타 URL 만들기
const buildAvatarUri = (raw) => {
  if (!raw) return null;
  const v = cleanStr(raw);

  // 이미 http(s) 절대경로면 그대로
  if (/^https?:\/\//i.test(v)) return v;

  // 이미 /profile_photos/로 시작 -> API_BASE_URL + 그대로
  if (v.startsWith("/profile_photos/")) {
    return `${API_BASE_URL}${v}`;
  }

  // 파일명만 온 경우
  const file = v.replace(/^\//, "");
  return `${API_BASE_URL}/profile_photos/${file}`;
};

const safeNumber = (n, def = 0) => {
  const x = Number(n);
  return isNaN(x) ? def : x;
};
const fmtNum = (n) =>
  n === null || n === undefined || isNaN(Number(n))
    ? "-"
    : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fmtDate = (d) => {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (!isNaN(date)) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(d).slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
};

export default function AdminRankingContent() {
  const [me, setMe] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  // 진입/포커스 시 토큰 로드
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;
        try {
          const decoded = jwt_decode(token);
          setMe(decoded);
        } catch (e) {
          console.warn("JWT decode 실패:", e);
        }
      })();
    }, [])
  );

  // 랭킹 로드
  useEffect(() => {
    if (!me?.user_id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/account.ranking?user_id=${me.user_id}`);
        const raw = await res.json();
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;

        const list = Array.isArray(data?.ranking) ? data.ranking : [];

        // 각 항목 클린업: 닉네임/이름/이메일 중 표시값 정리
        const normalized = list.map((row) => {
          const nickname = cleanStr(row.nickname);
          const realname = cleanStr(row.realname || row.name); // 혹시 오는 경우
          const email = cleanStr(row.email);
          const displayName =
            nickname ||
            realname ||
            (email ? email.split("@")[0] : "") ||
            cleanStr(row.user_id) ||
            "사용자";

          return {
            ...row,
            nickname: displayName,
            profile_pic_url: cleanStr(row.profile_pic_url),
            score: safeNumber(row.score, 0),
          };
        });

        setRanking(normalized);
      } catch (e) {
        Alert.alert("오류", "랭킹을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  // 상세 열기
  const openDetail = async (row) => {
    const baseDetail = {
      user_id: cleanStr(row.user_id),
      nickname: cleanStr(row.nickname),
      score: safeNumber(row.score, 0),
      profile_pic_url: cleanStr(row.profile_pic_url),
      email: cleanStr(row.email),
      phone: cleanStr(row.phone),
      address: cleanStr(row.address),
      reports_count: safeNumber(row.reports_count ?? row.report_count, 0),
      last_report_date: cleanStr(row.last_report_date),
      joined_at: cleanStr(row.joined_at ?? row.created_at),
    };

    setDetail(baseDetail);
    setDetailOpen(true);

    // 상세 API로 덮어쓰기
    try {
      setDetailLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) throw new Error("no token");

      const res = await fetch(
        `${API_BASE_URL}/admin/users/${encodeURIComponent(row.user_id)}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );

      if (res.ok) {
        const json = await res.json();
        const u = json?.result ?? json;

        setDetail((prev) => ({
          ...prev,
          email: cleanStr(u?.email) || prev.email,
          phone: cleanStr(u?.phone ?? u?.phone_number) || prev.phone,
          address: cleanStr(u?.address) || prev.address,
          reports_count: safeNumber(u?.reports_count ?? u?.report_count, prev.reports_count),
          last_report_date: cleanStr(u?.last_report_date) || prev.last_report_date,
          joined_at: cleanStr(u?.joined_at ?? u?.created_at) || prev.joined_at,
          profile_pic_url: cleanStr(u?.avatar_url || u?.profile_pic_url || prev.profile_pic_url),
          nickname:
            cleanStr(u?.nickname) ||
            cleanStr(u?.name) ||
            prev.nickname,
        }));
      }
    } catch (e) {
      // 실패해도 기본정보 표시
    } finally {
      setDetailLoading(false);
    }
  };

  // 왕관 색상
  const crownColor = (rank) =>
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : null;

  // 리스트 아이템
  const renderItem = ({ item }) => {
    const crown = crownColor(item.rank);
    const uri = buildAvatarUri(item.profile_pic_url);

    const avatar = (
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {crown && (
          <FontAwesome5
            name="crown"
            size={20}
            color={crown}
            style={{ position: "absolute", top: -12, zIndex: 2 }}
          />
        )}
        {uri ? (
          <Image
            source={{ uri }}
            style={{ ...listStyles.avatar, borderWidth: 3, borderColor: crown || "transparent" }}
          />
        ) : (
          <View
            style={{
              ...listStyles.avatar,
              backgroundColor: "#eee",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text>?</Text>
          </View>
        )}
      </View>
    );

    return (
      <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
        <View style={listStyles.item}>
          <Text style={listStyles.rank}>{item.rank}</Text>
          {avatar}
          <Text style={listStyles.nickname} numberOfLines={1} ellipsizeMode="tail">
            {item.nickname}
          </Text>
          <Text style={listStyles.score}>{fmtNum(item.score)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item, idx) => (item.user_id ? String(item.user_id) : String(idx));

  return (
    <View style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
      <Text style={listStyles.title}>전국 등록왕 순위 (관리자)</Text>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={ranking}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}

      {/* 개인정보 모달 */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {detailLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 18 }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: "#666" }}>상세 불러오는 중…</Text>
              </View>
            ) : (
              <>
                {/* 헤더 */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {buildAvatarUri(detail?.profile_pic_url) ? (
                    <Image
                      source={{ uri: buildAvatarUri(detail?.profile_pic_url) }}
                      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee" }}
                    />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee" }} />
                  )}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800" }}>{cleanStr(detail?.nickname)}</Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>{cleanStr(detail?.user_id)}</Text>
                  </View>
                </View>

                {/* 본문 */}
                <View style={{ marginTop: 12 }}>
                  <KV label="점수" value={fmtNum(detail?.score)} />
                  <KV label="신고 횟수" value={fmtNum(detail?.reports_count)} />
                  <KV label="최근 신고" value={fmtDate(detail?.last_report_date)} />
                  <KV label="이메일" value={cleanStr(detail?.email) || "-"} />
                  <KV label="전화번호" value={cleanStr(detail?.phone) || "-"} />
                  <KV label="주소" value={cleanStr(detail?.address) || "-"} />
                  <KV label="가입일" value={fmtDate(detail?.joined_at)} />
                </View>

                <TouchableOpacity style={s.closeBtn} onPress={() => setDetailOpen(false)}>
                  <Text style={s.closeBtnText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- 보조 & 스타일 ---------- */

function KV({ label, value }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue} numberOfLines={2}>
        {value ?? "-"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  kvRow: { flexDirection: "row", marginBottom: 8 },
  kvLabel: { width: 78, fontWeight: "700", color: "#436D9D" },
  kvValue: { flex: 1, color: "#222" },
  closeBtn: {
    marginTop: 14,
    backgroundColor: "#436D9D",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  closeBtnText: { color: "#fff", fontWeight: "700" },
});