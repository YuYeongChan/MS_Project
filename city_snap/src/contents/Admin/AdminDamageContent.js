import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { API_BASE_URL, googleMapsApiKey } from "../../utils/config";

const USE_MOCK_ONLY = false;
const USE_PLACEHOLDER_ANALYZED = true;

export default function AdminDamageContent() {
  const [damageLocations, setDamageLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCenter] = useState({ lat: 37.5665, lng: 126.978 });

  useEffect(() => {
    const init = async () => {
      try {
        if (USE_MOCK_ONLY) {
          // MOCK 사용 시에도 setState 실행
          setDamageLocations(
            ensureUiFields(
              MOCK_DATA.filter(
                (loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
              )
            )
          );
        } else {
          const ok = await fetchDamageLocations();
          if (!ok) {
            setDamageLocations(
              ensureUiFields(
                MOCK_DATA.filter(
                  (loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
                )
              )
            );
          }
        }
      } catch {
        // 예외 시에도 0만 표시
        setDamageLocations(
          ensureUiFields(
            MOCK_DATA.filter(
              (loc) => String(loc.REPAIR_STATUS ?? loc.repair_status) === "0"
            )
          )
        );
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const ensureUiFields = (list) =>
    (list || []).map((loc) => {
      const repairStatus = Number(loc.REPAIR_STATUS ?? loc.repair_status ?? 0);
      return {
        ...loc,
        REPAIR_STATUS: repairStatus,
        status_text: repairStatus === 0 ? "파손 - 수리대기중" : "수리완료",
        // AI 분석 텍스트는 사용하지 않음
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
      const res = await fetch(`${API_BASE_URL}/get_all_damage_reports`);
      const data = await res.json();
      if (res.ok && (Array.isArray(data.result) || Array.isArray(data))) {
        const rows = Array.isArray(data.result) ? data.result : data;
        // REPAIR_STATUS === 0만 남김
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
          ? `${API_BASE_URL}/registration_photos/${String(loc.photo_url).replace(
              /^\//,
              ""
            )}`
          : `https://picsum.photos/seed/${loc.report_id || Math.random()}/600/360`;

        const analyzed = loc.analyzed_photo_url
          ? String(loc.analyzed_photo_url).startsWith("http")
            ? loc.analyzed_photo_url
            : `${API_BASE_URL}/analysis_photos/${String(loc.analyzed_photo_url).replace(
                /^\//,
                ""
              )}`
          : USE_PLACEHOLDER_ANALYZED
          ? `https://picsum.photos/seed/analyzed-${loc.report_id || Math.random()}/600/360`
          : null;

        const repair_status = Number(loc.REPAIR_STATUS ?? loc.repair_status ?? 0);
        const status_text =
          loc.status_text ?? (repair_status === 0 ? "파손 - 수리대기중" : "수리완료");

        return {
          lat: Number(loc.latitude),  // 숫자 변환
          lng: Number(loc.longitude), // 숫자 변환
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
          #map { position: relative; }
          #infoBox {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            padding: 40px 16px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            max-width: 340px;
            max-height: 70vh;
            overflow: auto;
            font-size: 14px;
            display: none;
            z-index: 9999;
            font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            line-height: 1.5;
          }
          #infoBox .info-row { margin-bottom: 8px; color:#333; }
          #infoBox .label { font-weight: 700; color: #436D9D; }
          #infoBox img.basic {
            width: 100%;
            border-radius: 8px;
            margin-top: 10px;
            object-fit: cover;
            max-height: 220px;
          }
          #infoBox .closeBtn {
            position: absolute;
            top: 8px; right: 8px;
            background: #f44336; color: #fff;
            border: none; border-radius: 50%;
            width: 24px; height: 24px;
            text-align: center; line-height: 22px;
            cursor: pointer; font-size: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          /* (선택) 상태 배지 스타일 */
          #infoBox .status-badge {
            display:inline-block; padding:2px 8px; border-radius:12px;
            background:#ff9800; color:#fff; font-weight:700;
            margin-left:6px;
          }
          .hr { height:1px; background:#eee; margin:10px 0; }

          /* === 슬라이드 갤러리 === */
          .carousel {
            position: relative;
            width: 100%;
            height: 220px;
            overflow: hidden;
            border-radius: 8px;
            background: #00000010;
            margin-top: 10px;
            touch-action: pan-y;
          }
          .carousel .slides {
            display: flex;
            height: 100%;
            width: 200%; /* 2장 기준 */
            transform: translateX(0%);
            transition: transform 260ms ease;
          }
          .carousel .slide {
            flex: 0 0 100%;
            height: 100%;
          }
          .carousel .slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .carousel .arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 32px; height: 32px;
            border-radius: 50%;
            background: rgba(0,0,0,0.45);
            color: #fff;
            border: none;
            cursor: pointer;
          }
          .carousel .arrow.left { left: 8px; }
          .carousel .arrow.right { right: 8px; }
          .carousel .dots {
            position: absolute;
            bottom: 6px; left: 0; right: 0;
            display: flex; justify-content: center; gap: 6px;
          }
          .carousel .dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #ffffff88;
          }
          .carousel .dot.active { background: #ffffff; }
          .badgewrap {
            position: absolute; top: 8px; left: 8px; right: 8px;
            display: flex; justify-content: space-between; pointer-events: none;
          }
          .badge {
            font-size: 12px; font-weight: 700;
            background: rgba(0,0,0,0.55); color: #fff;
            padding: 4px 8px; border-radius: 6px;
          }
        </style>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&language=ko&callback=initMap"></script>
      </head>
      <body>
        <div id="map"></div>
        <div id="infoBox">
          <button class="closeBtn" onclick="hideInfoBox()">×</button>
          <div id="infoContent"></div>
        </div>
        <script>
          var map;
          var markers = [];
          var damageLocations = ${locationsArrayString};
          var infoBox, infoContent;

          function initMap() {
            map = new google.maps.Map(document.getElementById('map'), {
              center: new google.maps.LatLng(${centerLat}, ${centerLng}),
              zoom: 15,
              disableDefaultUI: false
            });

            infoBox = document.getElementById('infoBox');
            infoContent = document.getElementById('infoContent');

            damageLocations.forEach(function(location) {
              if (!location.lat || !location.lng) return;
              var marker = new google.maps.Marker({
                position: new google.maps.LatLng(location.lat, location.lng),
                map: map
              });
              marker.addListener('click', function() {
                showInfoBox(location, marker);
              });
              markers.push(marker);
            });
          }

          function esc(str) {
            if (!str) return "";
            return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
          }

          function showInfoBox(location, marker) {
            var hasBoth = !!(location.photo_url && location.analyzed_photo_url);
            var rows = [
              // 상태 + 배지
              '<div class="info-row"><span class="label">상태:</span> <span class="status-badge">' + esc(location.status_text) + '</span></div>',
              '<div class="info-row"><span class="label">주소:</span> ' + esc(location.address) + '</div>',
              '<div class="info-row"><span class="label">세부 내용:</span> ' + esc(location.details) + '</div>',
              '<div class="info-row"><span class="label">날짜:</span> ' + esc(location.date) + '</div>',
              '<div class="info-row"><span class="label">작성자:</span> ' + esc(location.nickname) + '</div>'
            ];

            if (hasBoth) {
              var cid = 'car_' + Math.random().toString(36).slice(2);
              rows.push(
                '<div class="carousel" id="'+cid+'">' +
                  '<div class="badgewrap">' +
                    '<div class="badge">원본</div>' +
                    '<div class="badge">분석 후</div>' +
                  '</div>' +
                  '<div class="slides">' +
                    '<div class="slide"><img src="'+location.photo_url+'" alt="원본" /></div>' +
                    '<div class="slide"><img src="'+location.analyzed_photo_url+'" alt="분석 후" /></div>' +
                  '</div>' +
                  '<button class="arrow left" data-dir="-1">&#10094;</button>' +
                  '<button class="arrow right" data-dir="1">&#10095;</button>' +
                  '<div class="dots"><div class="dot active"></div><div class="dot"></div></div>' +
                '</div>'
              );
            } else {
              if (location.photo_url) {
                rows.push('<img class="basic" src="' + location.photo_url + '" alt="원본 이미지" />');
              }
              if (location.analyzed_photo_url) {
                rows.push('<img class="basic" src="' + location.analyzed_photo_url + '" alt="분석 후 이미지" />');
              }
            }

            infoContent.innerHTML = rows.join('');
            infoBox.style.display = "block";
            map.panTo(marker.getPosition());

            if (hasBoth) initCarousel();
          }

          function hideInfoBox() { infoBox.style.display = "none"; }

          function initCarousel() {
            document.querySelectorAll('.carousel').forEach(function(root){
              var slidesWrap = root.querySelector('.slides');
              var dots = root.querySelectorAll('.dot');
              var leftBtn = root.querySelector('.arrow.left');
              var rightBtn = root.querySelector('.arrow.right');
              var index = 0;
              var startX = 0, currentX = 0, dragging = false, moved = false;

              function apply() {
                slidesWrap.style.transition = 'transform 260ms ease';
                slidesWrap.style.transform = 'translateX(' + (-index * 100) + '%)';
                dots.forEach(function(d, i){ d.classList.toggle('active', i === index); });
              }

              function jumpTo(idx) {
                index = Math.max(0, Math.min(1, idx));
                apply();
              }

              function onPointerDown(clientX) {
                dragging = true; moved = false;
                startX = clientX;
                currentX = clientX;
                slidesWrap.style.transition = 'none';
              }
              function onPointerMove(clientX) {
                if (!dragging) return;
                var dx = clientX - startX;
                currentX = clientX;
                var base = -index * root.clientWidth;
                slidesWrap.style.transform = 'translateX(' + (base + dx) + 'px)';
                moved = true;
              }
              function onPointerUp() {
                if (!dragging) return;
                var dx = currentX - startX;
                dragging = false;
                if (dx > 50) jumpTo(index - 1);
                else if (dx < -50) jumpTo(index + 1);
                else apply();
              }

              root.addEventListener('mousedown', function(e){ onPointerDown(e.clientX); });
              window.addEventListener('mousemove', function(e){ onPointerMove(e.clientX); });
              window.addEventListener('mouseup', onPointerUp);

              root.addEventListener('touchstart', function(e){
                if (e.touches && e.touches[0]) onPointerDown(e.touches[0].clientX);
              }, { passive: true });
              root.addEventListener('touchmove', function(e){
                if (e.touches && e.touches[0]) onPointerMove(e.touches[0].clientX);
              }, { passive: true });
              root.addEventListener('touchend', onPointerUp, { passive: true });

              leftBtn.addEventListener('click', function(){ jumpTo(index - 1); });
              rightBtn.addEventListener('click', function(){ jumpTo(index + 1); });
              dots.forEach(function(d, i){ d.addEventListener('click', function(){ jumpTo(i); }); });

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