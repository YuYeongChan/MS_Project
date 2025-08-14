import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { API_BASE_URL, googleMapsApiKey } from "../../utils/config";
import { appEvents, EVENTS } from "../../utils/eventBus";

const USE_MOCK_ONLY = false;
const USE_PLACEHOLDER_ANALYZED = true;

export default function AdminDamageContent() {
  const [damageLocations, setDamageLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCenter] = useState({ lat: 37.5665, lng: 126.978 });

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        if (USE_MOCK_ONLY) {
          if (!isMounted) return;
          setDamageLocations(
            ensureUiFields(
              MOCK_DATA.filter((loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0")
            )
          );
        } else {
          const ok = await fetchDamageLocations();
          if (!ok && isMounted) {
            setDamageLocations(
              ensureUiFields(
                MOCK_DATA.filter((loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0")
              )
            );
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    const onReportStatusUpdated = () => {
      fetchDamageLocations();
    };
    appEvents.on(EVENTS.REPORT_STATUS_UPDATED, onReportStatusUpdated);

    return () => {
      isMounted = false;
      appEvents.off(EVENTS.REPORT_STATUS_UPDATED, onReportStatusUpdated);
    };
  }, []);

  const ensureUiFields = (list) =>
    (list || []).map((loc) => {
      const repairStatus = Number(loc.REPAIR_STATUS ?? loc.repair_status ?? 0);
      return {
        ...loc,
        REPAIR_STATUS: repairStatus,
        status_text: repairStatus === 0 ? "파손 - 수리대기중" : "수리완료",
        ai_result_text: "",
        analyzed_photo_url:
          loc.analyzed_photo_url ??
          (USE_PLACEHOLDER_ANALYZED
            ? `https://picsum.photos/seed/analyzed-${loc.report_id || Math.random()}/600/360`
            : null),
      };
    });

  const fetchDamageLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_all_damage_reports`, {
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

  const generateMapHtml = (locations, center) => {
  const locationsArrayString = JSON.stringify(
    (locations || []).map((loc) => {
      const original = loc.photo_url
        ? `${API_BASE_URL}/registration_photos/${String(loc.photo_url).replace(/^\//, "")}`
        : `https://picsum.photos/seed/${loc.report_id || Math.random()}/600/360`;

      const analyzed = loc.analyzed_photo_url
        ? String(loc.analyzed_photo_url).startsWith("http")
          ? loc.analyzed_photo_url
          : `${API_BASE_URL}/analysis_photos/${String(loc.analyzed_photo_url).replace(/^\//, "")}`
        : USE_PLACEHOLDER_ANALYZED
        ? `https://picsum.photos/seed/analyzed-${loc.report_id || Math.random()}/600/360`
        : null;

      const repair_status = Number(loc.REPAIR_STATUS ?? loc.repair_status ?? 0);
      const status_text =
        loc.status_text ?? (repair_status === 0 ? "파손 - 수리대기중" : "수리완료");

      return {
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        address: loc.address || "주소 없음",
        details: loc.details || "내용 없음",
        date: loc.date || "",
        nickname: loc.nickname || "익명",
        photo_url: original,
        analyzed_photo_url: analyzed,
        repair_status,
        status_text,
      };
    })
  );

  const centerLat = center?.lat || 37.5665;
  const centerLng = center?.lng || 126.978;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <title>파손 현황 지도</title>
      <style>
        html, body, #map {height:100%; width:100%; margin:0; padding:0;}
        body { position: relative; }

        /* InfoBox + 바깥 닫기 버튼 래퍼 */
        #infoWrap {
          position: absolute;
          bottom: 20px;
          left: 47.5%;
          transform: translateX(-50%);
          width: 80%;
          z-index: 9999;
          pointer-events: none;
        }

        /* 바깥 X 버튼 */
        #outerCloseBtn {
          position: absolute;
          right: -30px;
          top: -40px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(244,67,54,0.95);
          color: #fff;
          border: none;
          font-size: 20px;
          line-height: 32px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          display: none;
          pointer-events: auto;
        }

        /* InfoBox 본체 */
        #infoBox {
          position: relative;
          background: white;
          border-radius: 12px;
          padding-top: 15px;
          padding-right: 15px;
          padding-left: 10px;
          box-shadow: 0px 4px 12px rgba(0,0,0,0.25);
          width: 100%;
          max-height: 70vh;
          overflow: auto;
          font-size: 16px;
          display: none;
          font-family: 'PretendardGOV-Regular', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          pointer-events: auto;
        }

        #infoBox .info-row { display: flex; align-items: flex-start; margin-bottom: 6px; }
        #infoBox .label { width: 70px; font-weight: bold; color: #436D9D; flex-shrink: 0; }
        #infoBox .value { flex: 1; color: #333; }
        #infoBox span.addr-title {
          font-weight: bold; font-size: 18px; margin-bottom: 8px; padding-bottom: 5px;
          display: inline-block; border-bottom: 2px solid #436d9de7; width: 100%;
        }
        #infoBox .description {
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; text-overflow: ellipsis; line-height: 1.5;
          max-height: calc(1.5em * 2); white-space: pre-line;
        }
        .hr { height:1px; background:#eee; margin:10px 0; }

        /* 가로 비교 (원본 ↔ 분석) */
        .horizontal-compare {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-radius: 8px;
          background: #00000010;
          margin-top: 10px;
          touch-action: pan-y; /* 수직 스크롤은 브라우저에 맡기고, 가로 스와이프는 우리가 처리 */
        }
        .horizontal-compare .slides {
          display: flex;
          flex-direction: row; /* 가로 방향 */
          width: 200%;         /* 두 슬라이드를 가로로 배치 */
          height: 100%;
          transform: translateX(0);
          transition: transform 260ms ease;
        }
        .horizontal-compare .slide {
          flex: 0 0 50%; /* 컨테이너의 절반 너비(= 한 슬라이드) */
          height: 100%;
        }
        .horizontal-compare .slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .horizontal-compare .controls {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
        }
        .horizontal-compare .badge {
          font-size: 12px;
          font-weight: 700;
          background: rgba(0,0,0,0.55);
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          display: none;
        }
      </style>
      <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&language=ko&callback=initMap"></script>
    </head>
    <body>
      <div id="map"></div>
      <div id="infoWrap">
        <button id="outerCloseBtn" aria-label="닫기">&times;</button>
        <div id="infoBox"><div id="infoContent"></div></div>
      </div>
      <script>
        var map, markers = [];
        var damageLocations = ${locationsArrayString};
        var infoBox, infoContent, outerCloseBtn;

        function initMap() {
          map = new google.maps.Map(document.getElementById('map'), {
            center: new google.maps.LatLng(${centerLat}, ${centerLng}),
            zoom: 15,
            disableDefaultUI: false
          });
          infoBox = document.getElementById('infoBox');
          infoContent = document.getElementById('infoContent');
          outerCloseBtn = document.getElementById('outerCloseBtn');
          if (outerCloseBtn) outerCloseBtn.addEventListener('click', hideInfoBox);

          damageLocations.forEach(function(location) {
            if (!location.lat || !location.lng) return;
            var marker = new google.maps.Marker({
              position: new google.maps.LatLng(location.lat, location.lng),
              map: map
            });
            marker.addListener('click', function() { showInfoBox(location, marker); });
            markers.push(marker);
          });
        }

        function esc(str) { if (!str) return ""; return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
        function hideInfoBox() { infoBox.style.display = "none"; outerCloseBtn.style.display = "none"; }

        function showInfoBox(location, marker) {
          var hasBoth = !!(location.photo_url && location.analyzed_photo_url);
          var rows = [
            '<span class="addr-title">' + esc(location.address) + '</span>',
            '<div class="info-row"><span class="label">날짜</span> <span class="value">' + esc(location.date) + '</span></div>',
            '<div class="info-row"><span class="label">작성자</span> <span class="value">' + esc(location.nickname) + '</span></div>',
            '<div class="info-row"><span class="label">상태</span> <span class="value">' + esc(location.status_text) + '</span></div>',
            '<div class="info-row"><span class="label">내용</span> <span class="value description">' + esc(location.details) + '</span></div>'
          ];
          if (hasBoth) {
            var cid = 'horizontal_' + Math.random().toString(36).slice(2);
            rows.push(
              '<div class="horizontal-compare" id="' + cid + '">' +
                '<div class="slides">' +
                  '<div class="slide"><img src="' + location.photo_url + '" alt="원본" /></div>' +
                  '<div class="slide"><img src="' + location.analyzed_photo_url + '" alt="분석 후" /></div>' +
                '</div>' +
                '<div class="controls">' +
                  '<div class="badge original-badge">원본</div>' +
                  '<div class="badge analyzed-badge">분석 후</div>' +
                '</div>' +
              '</div>'
            );
          } else {
            if (location.photo_url) rows.push('<div class="horizontal-compare"><div class="slides" style="width:100%"><div class="slide" style="flex:0 0 100%"><img src="'+location.photo_url+'" alt="원본" /></div></div></div>');
            if (location.analyzed_photo_url) rows.push('<div class="horizontal-compare"><div class="slides" style="width:100%"><div class="slide" style="flex:0 0 100%"><img src="'+location.analyzed_photo_url+'" alt="분석 후" /></div></div></div>');
          }
          infoContent.innerHTML = rows.join('');
          infoBox.style.display = "block";
          outerCloseBtn.style.display = "block";
          map.panTo(marker.getPosition());
          if (hasBoth) initHorizontalCompare();
        }

        function initHorizontalCompare() {
          document.querySelectorAll('.horizontal-compare').forEach(function(root){
            var slidesWrap = root.querySelector('.slides');
            var originalBadge = root.querySelector('.original-badge');
            var analyzedBadge = root.querySelector('.analyzed-badge');
            if (!slidesWrap) return;

            var index = 0;
            var startX = 0, currentX = 0, dragging = false;
            var slideWidth = root.clientWidth;

            function apply(animated = true) {
              slidesWrap.style.transition = animated ? 'transform 260ms ease' : 'none';
              var offset = -index * slideWidth;
              slidesWrap.style.transform = 'translateX(' + offset + 'px)';

              if (originalBadge) originalBadge.style.display = index === 0 ? 'block' : 'none';
              if (analyzedBadge) analyzedBadge.style.display = index === 1 ? 'block' : 'none';
            }

            function jumpTo(idx) {
              if (idx < 0) {
                index = 1; // 맨 왼쪽에서 오른쪽으로 스와이프 → 마지막으로
              } else if (idx > 1) {
                index = 0; // 맨 오른쪽에서 왼쪽으로 스와이프 → 처음으로
              } else {
                index = idx;
              }
              apply();
            }

            function onPointerDown(x){
              dragging = true;
              startX = x;
              slidesWrap.style.transition = 'none';
            }

            function onPointerMove(x){
              if(!dragging) return;
              var dx = x - startX;
              currentX = x;
              var base = -index * slideWidth;
              slidesWrap.style.transform = 'translateX(' + (base + dx) + 'px)';
            }

            function onPointerUp(){
              if(!dragging) return;
              var dx = currentX - startX;
              dragging = false;

              var swipeThreshold = slideWidth * 0.2; // 20% 이상이면 페이지 이동
              if (dx > swipeThreshold) {
                jumpTo(index - 1); // 오른쪽으로 스와이프(이전)
              } else if (dx < -swipeThreshold) {
                jumpTo(index + 1); // 왼쪽으로 스와이프(다음)
              } else {
                apply(); // 제자리 복귀
              }
            }

            // 마우스 이벤트
            root.addEventListener('mousedown', e => onPointerDown(e.clientX));
            window.addEventListener('mousemove', e => onPointerMove(e.clientX));
            window.addEventListener('mouseup', () => { if(dragging) onPointerUp(); });
            root.addEventListener('mouseleave', () => { if(dragging) onPointerUp(); });

            // 터치 이벤트
            root.addEventListener('touchstart', e => { if(e.touches[0]) onPointerDown(e.touches[0].clientX); }, { passive: true });
            root.addEventListener('touchmove', e => { if(e.touches[0]) onPointerMove(e.touches[0].clientX); }, { passive: true });
            root.addEventListener('touchend', () => { if(dragging) onPointerUp(); }, { passive: true });

            apply();
          });
        }
      </script>
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

const MOCK_DATA = [];