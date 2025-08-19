import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { API_BASE_URL, googleMapsApiKey } from "../utils/config";
import { useNavigation } from "@react-navigation/native";
import jwt_decode from "jwt-decode";
import { getTokens } from "../auth/authStorage";

export default function DamageMapScreen() {
  const [damageLocations, setDamageLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCenter, setUserCenter] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const loadUserLocationAndDamageData = async () => {
      try {
        const { access } = await getTokens();

        if (!access) {
          Alert.alert("에러", "지도를 불러올 수 없습니다.");
          return;
        }

        const decoded = jwt_decode(access);
        const userAddress = decoded.address;

        if (!userAddress) {
          Alert.alert("주소 없음", "회원정보에 주소가 없습니다.");
        } else {
          const coords = await geocodeAddress(userAddress);
          setUserCenter(coords);
        }
      } catch (e) {
        console.warn(" 주소 변환 실패:", e.message);
      }

      fetchDamageLocations();
    };

    loadUserLocationAndDamageData();
  }, []);

  const geocodeAddress = async (address) => {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${googleMapsApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK") {
      return data.results[0].geometry.location;
    } else {
      throw new Error("주소를 좌표로 변환할 수 없습니다.");
    }
  };

  const fetchDamageLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_all_damage_reports`);
      const data = await res.json();

      // 베열 그대로 오든, {result:[...]}로 오든 모두 지원
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data.result)
          ? data.result
          : Array.isArray(data.data)
            ? data.data
            : [];
        if (!res.ok) throw new Error("bad response");
        setDamageLocations(rows);
    } catch (err) {
      Alert.alert("통신 오류", "파손 현황 조회 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- WebView HTML 생성 함수 ---
  const generateMapHtml = (locations, center) => {
    const locationsArrayString = JSON.stringify(
      (locations || []).map((loc) => {
        const images = [];
        if (loc.photo_url) {
          images.push({
            type: "제보 사진",
            url: `${API_BASE_URL}/registration_photos/${String(
              loc.photo_url
            ).replace(/^\//, "")}`,
          });
        }

        return {
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
          // ✔️ 서버 키에 맞춰 안전 폴백
          address: loc.location_description || loc.address || "주소 정보 없음",
          details: loc.details || "상세 내용 없음",
          date:
            (typeof loc.report_date === "string"
              ? loc.report_date.replace("T", " ").slice(0, 19)
              : loc.report_date) ||
            loc.date ||
            "날짜 정보 없음",
          nickname: loc.user_id || loc.nickname || "익명",
          images: images,
          status_text:
            Number(loc.repair_status ?? loc.REPAIR_STATUS ?? 0) === 0
              ? "수리 대기중"
              : "수리 완료",
        };
      })
    );

    const centerLat = center?.lat || 37.5665;
    const centerLng = center?.lng || 126.978;

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <title>파손 현황 지도</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
              html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }
              body { position: relative; font-family: 'Noto Sans KR', sans-serif; }
              #infoContainer { position: absolute; bottom: -100%; left: 0; width: 100%; z-index: 100; transition: bottom 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); pointer-events: none; padding: 0 10px 20px 10px; box-sizing: border-box; }
              #infoCard { background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); overflow: hidden; max-height: 80vh; display: flex; flex-direction: column; pointer-events: auto; }
              #cardContent { overflow-y: auto; padding: 16px; }
              #backBtn { position: absolute; top: 10px; left: 10px; width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; cursor: pointer; z-index: 20; display: flex; align-items: center; justify-content: center; }
              .image-section { position: relative; width: 100%; background-color: #f1f3f5; padding: 16px 0; }
              .image-scroll-container { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
              .image-scroll-container::-webkit-scrollbar { display: none; }
              .image-slider { display: flex; gap: 12px; padding: 0 16px; }
              
              .image-card { 
                flex: 0 0 100%; /* 화면 전체 너비 */
                max-width: 100%;
                scroll-snap-align: start; 
                position: relative;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                overflow: hidden;
                background-color: #e9ecef;
                aspect-ratio: 4 / 3;
              }
              .image-card img { 
                width: 100%; 
                height: 100%; 
                object-fit: cover;
              }

              .image-badge { 
                position: absolute; 
                top: 10px; 
                right: 10px;
                padding: 5px 10px; 
                border-radius: 15px; 
                font-size: 12px; 
                font-weight: 700; 
                color: white; 
                background-color: rgba(0, 123, 255, 0.8); 
              }

              .info-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
              .info-item svg { width: 20px; height: 20px; margin-right: 12px; fill: #868e96; flex-shrink: 0; margin-top: 2px; }
              .info-text .label { font-weight: 700; font-size: 16px; color: #212529; margin-bottom: 2px; }
              .info-text .value { font-size: 14px; color: #495057; line-height: 1.5; }
              #address-info .label { font-size: 18px; }
          </style>
          <script>
            window.onerror = function(msg){
              var el = document.createElement('div');
              el.style.cssText='position:absolute;top:8px;left:8px;z-index:9999;background:#ffe3e3;color:#c92a2a;padding:6px 8px;border-radius:6px;font:12px/1.2 -apple-system,Roboto,Segoe UI,Helvetica;';
              el.textContent = 'JS Error: ' + msg;
              document.body.appendChild(el);
            };
          </script>
      </head>
      <body>
          <div id="map"></div>
          <div id="infoContainer">
              <div id="infoCard">
                  <div class="image-section">
                      <div class="image-scroll-container">
                          <div id="imageSlider" class="image-slider"></div>
                      </div>
                       <button id="backBtn" aria-label="뒤로가기">
                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                       </button>
                  </div>
                  <div id="cardContent">
                      <div id="address-info" class="info-item"></div>
                      <div id="details-info" class="info-item"></div>
                      <div id="date-info" class="info-item"></div>
                      <div id="user-info" class="info-item"></div>
                      <div id="status-info" class="info-item"></div>
                  </div>
              </div>
          </div>
          <script>
              var map, markers = [];
              var damageLocations = ${locationsArrayString};
              var infoContainer, backBtn;
              var currentMarker = null;

              const ICONS = {
                  location: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
                  calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zM5 8V6h14v2H5z"/></svg>',
                  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
                  status: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-4-4 1.41-1.41L10 12.17l6.59-6.59L18 7l-8 8z"/></svg>'
              };
              
              function initMap() {
                  map = new google.maps.Map(document.getElementById('map'), {
                      center: new google.maps.LatLng(${centerLat}, ${centerLng}),
                      zoom: 15,
                      disableDefaultUI: false,
                      gestureHandling: 'greedy'
                  });

                  infoContainer = document.getElementById('infoContainer');
                  backBtn = document.getElementById('backBtn');
                  backBtn.addEventListener('click', hideInfoBox);
                  map.addListener('click', hideInfoBox);

                  damageLocations.forEach(function(location) {
                      if (!location.lat || !location.lng) return;
                      var marker = new google.maps.Marker({
                          position: new google.maps.LatLng(location.lat, location.lng),
                          map: map
                      });
                      marker.addListener('click', function(e) {
                          if (e.domEvent) e.domEvent.stopPropagation();
                          showInfoBox(location, marker);
                      });
                      markers.push(marker);
                  });
              }
              // ⭐ 콜백 전역 바인딩 (가장 중요)
              window.initMap = initMap;

              function esc(str) { if (!str) return ""; return String(str).replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
              
              function hideInfoBox() {
                  if (infoContainer.style.bottom === '0px') {
                      infoContainer.style.bottom = "-100%";
                      if(currentMarker) currentMarker = null;
                  }
              }

              function createInfoItem(icon, label, value) {
                  return \`\${icon}<div class="info-text"><div class="label">\${esc(label)}</div><div class="value">\${esc(value)}</div></div>\`;
              }
              
              function showInfoBox(location, marker) {
                  const imageSlider = document.getElementById('imageSlider');
                  imageSlider.innerHTML = '';

                  if (location.images && location.images.length > 0) {
                    location.images.forEach(img => {
                        const cardHTML = \`
                            <div class="image-card">
                                <img src="\${img.url}" alt="\${esc(img.type)}"
                                     onerror="this.parentElement.innerHTML = '<div style=&quot;width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#868e96;&quot;>이미지 로딩 실패</div>'">
                                <div class="image-badge">\${esc(img.type)}</div>
                            </div>
                        \`;
                        imageSlider.innerHTML += cardHTML;
                    });
                  } else {
                      imageSlider.innerHTML = '<div style="text-align:center; width:100%; padding: 20px 0; color: #868e96;">표시할 이미지가 없습니다.</div>';
                  }

                  document.getElementById('address-info').innerHTML = createInfoItem(ICONS.location, '위치', location.address);
                  document.getElementById('details-info').innerHTML = createInfoItem(ICONS.location, '신고 내용', location.details);
                  document.getElementById('date-info').innerHTML = createInfoItem(ICONS.calendar, '신고 날짜', location.date);
                  document.getElementById('user-info').innerHTML = createInfoItem(ICONS.user, '신고자', location.nickname);
                  document.getElementById('status-info').innerHTML = createInfoItem(ICONS.status, '현재 상태', location.status_text);
                  
                  infoContainer.style.bottom = "0px";
                  map.panTo(marker.getPosition());
                  if (map.getZoom() < 16) map.setZoom(16);
                  currentMarker = marker;
              }
          </script>
          <!-- ⭐ 구글 맵 스크립트는 함수 정의 이후에 로드 -->
          <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&language=ko&callback=initMap"></script>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>지도를 불러오는 중입니다...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {damageLocations.length > 0 ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html: generateMapHtml(damageLocations, userCenter) }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webView}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>등록된 파손 현황이 없습니다.</Text>
        </View>
      )}

      <View style={styles.closeButtonContainer}>
        <TouchableOpacity
          style={styles.closeMapButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              Alert.alert("알림", "뒤로 갈 수 없습니다.");
            }
          }}
        >
          <Text style={styles.closeButtonText}>지도 닫기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noDataContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noDataText: { fontSize: 18, color: "#555" },
  webView: { flex: 1 },
  closeButtonContainer: { position: "absolute", top: 50, right: 20, zIndex: 100 },
  closeMapButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  closeButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
