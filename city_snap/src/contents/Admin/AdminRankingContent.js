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
import jwt_decode from "jwt-decode";
import { API_BASE_URL } from "../../utils/config";
import { useFocusEffect } from "@react-navigation/native";
import { styles as listStyles } from "../../style/RankingStyle";
import { getTokens } from "../../auth/authStorage";
import { apiFetch } from "../../auth/api";

// ---------- 유틸 ----------
const cleanStr = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\t\r\n]/g, "").replace(/^"+|"+$/g, "").trim();
};

// 이메일 형태인지 체크
const isEmail = (v) => typeof v === 'string' && /.+@.+\..+/.test(v);

// 조회 경로를 상황에 맞게 결정
const buildUserDetailUrl = (row) => {
  const uid = row.user_pk || row.id || row.user_id; // 우선 PK/ID가 있으면 사용
  if (uid && !isEmail(uid)) {
    // 숫자/UUID 등 PK라면 path-param 사용
    return `${API_BASE_URL}/admin/users/${encodeURIComponent(String(uid))}`;
  }
  // 이메일만 가진 경우: 백엔드에 이메일 조회용 엔드포인트가 있다고 가정
  // 없으면 백엔드에 하나 만들어 달라고 요청해야 합니다.
  return `${API_BASE_URL}/admin/users/by-email?email=${encodeURIComponent(String(uid))}`;
};


const buildAvatarUri = (raw) => {
  if (!raw) return null;
  const v = cleanStr(raw);
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/profile_photos/")) return `${API_BASE_URL}${v}`;
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

export default function AdminRankingContent() {
  const [me, setMe] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  // 사용자 정보 로드
  useFocusEffect(
      useCallback(() => {
        (async () => {
          const { access } = await getTokens();
          if (access){
            try{
              const decoded = jwt_decode(access);
              setMe(decoded);
            } catch (error) {
              console.error('토큰 디코딩 오류:', error);
            }
          }
        })();
    }, [])
  );

  useEffect(() => {
    if (!me?.user_id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/account.ranking?user_id=${me.user_id}`);
        const raw = await res.json();
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;

        const list = Array.isArray(data?.ranking) ? data.ranking : [];
        const normalized = list.map((row) => {
          const nickname = cleanStr(row.nickname);
          const realname = cleanStr(row.realname || row.name);
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

    try {
      setDetailLoading(true);
      const { access } = await getTokens();
      if (!access) throw new Error("no token");
      
      const url = buildUserDetailUrl(row);

      const res = await apiFetch(url);

      if (res.ok) {
        const json = await res.json();
        // u 추출은 이전에 드린 pick() 로직 재사용
        const u = (json.result ?? json.data ?? json.user ?? json.payload ?? json);

        setDetail((prev) => ({
          ...prev,
          phone: (u.phone ?? u.phone_number ?? u.mobile ?? u.tel ?? prev.phone) || "-",
          address: (u.address ?? u.address_line ?? u.addr ?? u.location ?? prev.address) || "-",
          reports_count: Number(u.reports_count ?? u.report_count ?? u.total_reports ?? prev.reports_count) || 0,
          profile_pic_url: (u.avatar_url ?? u.profile_pic_url ?? u.avatar ?? prev.profile_pic_url) || prev.profile_pic_url,
          nickname: (u.nickname ?? u.name ?? prev.nickname) || prev.nickname,
        }));
      } else {
        const txt = await res.text();
        console.log('admin/users fetch error:', res.status, txt);
        if (res.status === 404) {
          Alert.alert(
            "사용자 조회 불가",
            "선택한 항목의 식별자로 사용자를 찾을 수 없습니다.\n(이메일을 ID로 보내고 있을 수 있어요)"
          );
        } else {
          Alert.alert("오류", "사용자 상세를 불러오지 못했습니다.");
        }
      }
    } catch (e) {
      console.log('openDetail error:', e);
      Alert.alert("오류", "사용자 상세 조회 중 문제가 발생했습니다.");
    } finally {
      setDetailLoading(false);
    }

    setDetailOpen(true);
  };

  const crownColor = (rank) =>
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : null;

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
                {/* 헤더: 아바타만 표시 (개인정보 최소화) */}
                <View style={{ alignItems: "center", marginBottom: 10 }}>
                  {buildAvatarUri(detail?.profile_pic_url) ? (
                    <Image
                      source={{ uri: buildAvatarUri(detail?.profile_pic_url) }}
                      style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#eee" }}
                    />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#eee" }} />
                  )}
                </View>

                {/* 본문: 요청하신 5개 항목만 노출 */}
                <View style={{ marginTop: 4 }}>
                  <KV label="점수" value={fmtNum(detail?.score)} />
                  <KV label="신고 횟수" value={fmtNum(detail?.reports_count)} />
                  <KV label="닉네임" value={cleanStr(detail?.nickname) || "-"} />
                  <KV label="아이디" value={cleanStr(detail?.user_id)} />
                  <KV label="전화번호" value={cleanStr(detail?.phone) || "-"} />
                  <KV label="주소" value={cleanStr(detail?.address) || "-"} />
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