import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { API_BASE_URL, googleMapsApiKey } from "../../utils/config";
import { appEvents, EVENTS } from "../../utils/eventBus";

// 개발용 목업 데이터 사용 여부 (실제 API를 사용하려면 false로 설정)
const USE_MOCK_ONLY = false;
// 분석된 이미지가 없을 경우 임시 이미지 사용 여부
// 조회 API: AI 필드(ai_status, caption_ko, mask_url)를 포함하는 엔드포인트 사용
const REPORTS_API = `${API_BASE_URL}/management.reports`; // ⭐ 중요

export default function AdminDamageContent() {
  const [damageLocations, setDamageLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCenter] = useState({ lat: 37.5665, lng: 126.978 }); // 기본 지도 중심

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        if (USE_MOCK_ONLY) {
          if (!isMounted) return;
          setDamageLocations(
            ensureUiFields(
              MOCK_DATA.filter(
                (loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
              )
            )
          );
        } else {
          const ok = await fetchDamageLocations();
          if (!ok && isMounted) {
            setDamageLocations(
              ensureUiFields(
                MOCK_DATA.filter(
                  (loc) =>
                    String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
                )
              )
            );
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    // 신고 상태 업데이트 이벤트 리스너
    const onReportStatusUpdated = () => {
      fetchDamageLocations();
    };
    appEvents.on(EVENTS.REPORT_STATUS_UPDATED, onReportStatusUpdated);

    return () => {
      isMounted = false;
      appEvents.off(EVENTS.REPORT_STATUS_UPDATED, onReportStatusUpdated);
    };
  }, []);

  // 경로 정리 유틸
  const normalizePath = (p) =>
    String(p || "").replace(/\\/g, "/").replace(/^\.?\//, "");
  const toHttpUrl = (p) => {
    const s = normalizePath(p);
    if (!s) return null;
    return s.startsWith("http") ? s : `${API_BASE_URL}/${s}`;
  };
  const trimLeadingSlash = (f) => String(f || "").replace(/^\//, "");

  const ensureUiFields = (list) =>
    (list || []).map((loc) => {
      const repairStatus = Number(loc.REPAIR_STATUS ?? loc.repair_status ?? 0);
      const hasMask = !!loc.mask_url;
      const analyzedUrl = hasMask
        ? toHttpUrl(loc.mask_url)                        // ⭐ DB의 analysis_photo\*.png → http URL로
        : `${API_BASE_URL}/mask_images/no_mask_image.png`; // ⭐ 마스크 없을 땐 플레이스홀더

      const aiText = hasMask
        ? (loc.ai_status || "AI 결과 없음")              // ⭐ 마스크 있으면 ai_status
        : (loc.caption_ko || loc.ai_status || "AI 결과 없음"); // ⭐ 없으면 caption_ko

      return {
        ...loc,
        REPAIR_STATUS: repairStatus,
        status_text: repairStatus === 0 ? "파손 - 수리대기중" : "수리완료",
        ai_result_text: aiText,                           // ⭐ 상세 패널 텍스트 용
        analyzed_photo_url: analyzedUrl,                  // ⭐ 슬라이더의 AI 분석 이미지 URL
        _photo_url_http: `${API_BASE_URL}/registration_photos/${trimLeadingSlash(loc.photo_url)}`, // 편의 필드
        // 아래 3개는 상세 패널 표시용 안전 필드
        _address: loc.location_description || "주소 정보 없음",
        _date: loc.report_date || loc.date || "날짜 정보 없음",
        _nickname: loc.user_id || loc.nickname || "익명",
      };
    });

  // API로부터 파손 위치 데이터를 가져오는 함수
  const fetchDamageLocations = async () => {
    try {
      const res = await fetch(REPORTS_API, {  // ⭐ AI 필드 포함 응답 사용
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (res.ok && (Array.isArray(data.result) || Array.isArray(data))) {
        const rows = Array.isArray(data.result) ? data.result : data;
        const filtered = rows.filter(
          (loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
        );
        setDamageLocations(ensureUiFields(filtered));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // WebView에 삽입될 전체 HTML을 생성하는 함수 (UI 디자인만 수정)
  const generateMapHtml = (locations, center) => {
    const locationsArrayString = JSON.stringify(
      (locations || []).map((loc) => {
        const images = [];

        // 항상 '원본' 추가
        if (loc._photo_url_http) {
          images.push({ type: "원본", url: loc._photo_url_http });
        }
        // 항상 'AI 분석' 추가 (마스크 없으면 no_mask_image.png로 대체)
        images.push({
          type: "AI 분석",
          url: loc.analyzed_photo_url, // 이미 http URL 상태
        });

        return {
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
          // ⭐ 주소/날짜/닉네임을 '확실한' 키로 생성 + 폴백
          address: loc._address
            || loc.location_description
            || "주소 정보 없음",
          details: loc.details || "상세 내용 없음",
          date: loc._date
            || loc.report_date
            || loc.date
            || "날짜 정보 없음",
          nickname: loc._nickname
            || loc.user_id
            || loc.nickname
            || "익명",
          images: images,
          status_text: loc.status_text,
          ai_result_text: loc.ai_result_text,
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
          <title>지도 정보창</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
              html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }
              body { position: relative; font-family: 'Noto Sans KR', sans-serif; }
              #infoContainer { position: absolute; bottom: -100%; left: 0; width: 100%; z-index: 100; transition: bottom 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); pointer-events: none; padding: 0 10px 20px 10px; box-sizing: border-box; }
              #infoCard { background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); overflow: hidden; max-height: 80vh; display: flex; flex-direction: column; pointer-events: auto; }
              #cardContent { overflow-y: auto; padding: 16px; }
              #closeBtn { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; border: none; font-size: 18px; line-height: 28px; text-align: center; cursor: pointer; z-index: 20; font-weight: bold; }
              .image-section { position: relative; width: 100%; background-color: #f1f3f5; padding: 16px 0; }
              .image-scroll-container { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
              .image-scroll-container::-webkit-scrollbar { display: none; }
              .image-slider { display: flex; gap: 12px; padding: 0 16px; }
              .image-card { flex: 0 0 80%; height: 180px; scroll-snap-align: start; position: relative; }
              .image-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
              .image-badge { position: absolute; top: 10px; left: 10px; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 700; color: white; }
              .badge-original { background-color: rgba(0, 123, 255, 0.8); }
              .badge-analyzed { background-color: rgba(0, 123, 255, 0.8); }
              .badge-extra { background-color: rgba(40, 167, 69, 0.8); }
              .info-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
              .info-item svg { width: 20px; height: 20px; margin-right: 12px; fill: #868e96; flex-shrink: 0; margin-top: 2px; }
              .info-text .label { font-weight: 700; font-size: 16px; color: #212529; margin-bottom: 2px; }
              .info-text .value { font-size: 14px; color: #495057; line-height: 1.5; }
              #address-info .label { font-size: 18px; }
              .ai-section { background-color: #e7f5ff; border-radius: 12px; padding: 16px; margin-top: 16px; }
              .ai-section .info-item { margin-bottom: 0; }
              .ai-section svg { width: 20px; height: 20px; fill: #1971c2; }
              .ai-section .label { color: #1864ab; font-weight: 700; }
              .ai-section .value { color: #1c7ed6; }
          </style>
          <script>
            // ⭐ WebView에서 오류 보이도록
            window.onerror = function(msg, src, line, col, err){
              const el = document.createElement('div');
              el.style.cssText='position:absolute;top:8px;left:8px;z-index:9999;background:#ffe3e3;color:#c92a2a;padding:6px 8px;border-radius:6px;font:12px/1.2 -apple-system,Roboto,Segoe UI,Helvetica;';
              el.textContent = 'JS Error: ' + msg;
              document.body.appendChild(el);
            };
          </script>
          <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&language=ko&callback=initMap"></script>
      </head>
      <body>
          <div id="map"></div>
          <div id="infoContainer">
              <div id="infoCard">
                  <div class="image-section">
                      <div class="image-scroll-container">
                          <div id="imageSlider" class="image-slider"></div>
                      </div>
                       <button id="closeBtn" aria-label="닫기">&times;</button>
                  </div>
                  <div id="cardContent">
                      <div id="address-info" class="info-item"></div>
                      <div id="date-info" class="info-item"></div>
                      <div id="user-info" class="info-item"></div>
                      <div id="status-info" class="info-item"></div>
                      <div id="ai-section" class="ai-section"></div>
                  </div>
              </div>
          </div>
          <script>
              var map, markers = [];
              var damageLocations = ${locationsArrayString};
              var infoContainer, closeBtn;
              var currentMarker = null;

              const ICONS = {
                  location: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
                  calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zM5 8V6h14v2H5z"/></svg>',
                  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
                  status: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-4-4 1.41-1.41L10 12.17l6.59-6.59L18 7l-8 8z"/></svg>',
                  ai: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h10v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12H8v-2h8v2zm2-4h-2v-2H8v2H6v-4c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v4z"/><circle cx="12" cy="12.5" r="1.5"/><path d="M12 12.5c-1.38 0-2.5 1.12-2.5 2.5h5c0-1.38-1.12-2.5-2.5-2.5z"/></svg>'
              };
              
              function initMap() {
                  map = new google.maps.Map(document.getElementById('map'), {
                      center: new google.maps.LatLng(${centerLat}, ${centerLng}),
                      zoom: 15,
                      disableDefaultUI: true,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                      gestureHandling: 'greedy' // 한 손가락으로 지도 이동 허용
                  });

                  infoContainer = document.getElementById('infoContainer');
                  closeBtn = document.getElementById('closeBtn');
                  closeBtn.addEventListener('click', hideInfoBox);
                  map.addListener('click', hideInfoBox);

                  damageLocations.forEach(function(location) {
                      if (!location.lat || !location.lng) return;
                      var marker = new google.maps.Marker({
                          position: new google.maps.LatLng(location.lat, location.lng),
                          map: map,
                      });
                      marker.addListener('click', function(e) {
                          if (e.domEvent) e.domEvent.stopPropagation();
                          showInfoBox(location, marker);
                      });
                      markers.push(marker);
                  });
              }
              // 반드시 전역 바인딩(callback=initMap 이것을 찾음)
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
                        let badgeClass = 'badge-extra';
                        if (img.type === '원본') badgeClass = 'badge-original';
                        if (img.type === 'AI 분석') badgeClass = 'badge-analyzed';

                        const cardHTML = \`
                            <div class="image-card">
                                <img src="\${img.url}" alt="\${esc(img.type)}" onerror="this.src='https://placehold.co/800x600/eeeeee/cccccc?text=Image+Error'"/>
                                <div class="image-badge \${badgeClass}">\${esc(img.type)}</div>
                            </div>
                        \`;
                        imageSlider.innerHTML += cardHTML;
                    });
                  } else {
                      imageSlider.innerHTML = '<div style="text-align:center; width:100%; padding: 20px 0; color: #868e96;">표시할 이미지가 없습니다.</div>';
                  }

                  document.getElementById('address-info').innerHTML = createInfoItem(ICONS.location, location.address, location.details);
                  document.getElementById('date-info').innerHTML = createInfoItem(ICONS.calendar, '신고 날짜', location.date);
                  document.getElementById('user-info').innerHTML = createInfoItem(ICONS.user, '신고자', location.nickname);
                  document.getElementById('status-info').innerHTML = createInfoItem(ICONS.status, '현재 상태', location.status_text);
                  document.getElementById('ai-section').innerHTML = createInfoItem(ICONS.ai, 'AI 분석 결과', location.ai_result_text);
                  
                  infoContainer.style.bottom = "0px";
                  map.panTo(marker.getPosition());
                  if (map.getZoom() < 16) map.setZoom(16);
                  currentMarker = marker;
              }
          </script>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#436D9D" />
        <Text>지도를 불러오는 중입니다...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: generateMapHtml(damageLocations, userCenter) }}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  webView: { flex: 1 },
});

const MOCK_DATA = [
];