import React, { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import { googleMapsApiKey } from "../../utils/config";

export default function GoogleMapPicker({
  onLocationSelect,
  initialCenter = { lat: 37.5665, lng: 126.978 },
  initialZoom = 10,
  height = 300,
}) {
  const webRef = useRef(null);

  // 숫자 보정
  const lat = Number(initialCenter?.lat) || 37.5665;
  const lng = Number(initialCenter?.lng) || 126.978;
  const zoom = Number(initialZoom) || 15;

  const googleMapHTML = `
    <!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <title>Google Map Picker</title>
      <style>html,body,#map{height:100%;width:100%;margin:0;padding:0;}</style>
      <script defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=ko&callback=initMap"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map, marker, geocoder;

        function initMap() {
          try {
            var center = { lat: ${lat}, lng: ${lng} };

            map = new google.maps.Map(document.getElementById('map'), {
              center: center,
              zoom: ${zoom},
              disableDefaultUI: true
            });

            marker = new google.maps.Marker({
              position: center,
              map: map
            });

            geocoder = new google.maps.Geocoder();

            // 지도 클릭 시 역지오코딩
            map.addListener('click', function(e) {
              var latLng = e.latLng;
              marker.setPosition(latLng);

              geocoder.geocode({ location: latLng }, function(results, status) {
                var addr = '주소를 찾을 수 없습니다.';
                if (status === 'OK' && results && results[0]) {
                  addr = results[0].formatted_address;
                }
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  lat: latLng.lat(),
                  lng: latLng.lng(),
                  address: addr
                }));
              });
            });

            // RN → WebView: 중심 재설정(호환 위해 window/document 둘 다)
            function handleRecenter(ev) {
              try {
                var msg = JSON.parse(ev.data || '{}');
                if (msg.type === 'RECENTER' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
                  var c = new google.maps.LatLng(msg.lat, msg.lng);
                  map.setCenter(c);
                  marker.setPosition(c);
                  if (typeof msg.zoom === 'number') map.setZoom(msg.zoom);
                }
              } catch (_) {}
            }
            window.addEventListener('message', handleRecenter);
            document.addEventListener('message', handleRecenter);
          } catch (e) {
            window.ReactNativeWebView.postMessage("구글 지도 초기화 오류: " + e.message);
          }
        }
      </script>
    </body>
    </html>
  `;

  // prop 변경 시 재중심 (부모 key 재마운트와 함께 안전망)
  useEffect(() => {
    if (!webRef.current) return;
    const msg = JSON.stringify({ type: "RECENTER", lat, lng, zoom });
    const t = setTimeout(() => webRef.current?.postMessage(msg), 150);
    return () => clearTimeout(t);
  }, [lat, lng, zoom]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html: googleMapHTML }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          onLocationSelect?.(data);
        } catch {
          console.log("웹뷰:", event.nativeEvent.data);
        }
      }}
      // 페이지 로드 직후에도 한 번 더 RECENTER 보내서 initMap 타이밍 보장
      onLoad={() => {
        const msg = JSON.stringify({ type: "RECENTER", lat, lng, zoom });
        setTimeout(() => webRef.current?.postMessage(msg), 100);
      }}
      style={{ width: "100%", height }}
    />
  );
}