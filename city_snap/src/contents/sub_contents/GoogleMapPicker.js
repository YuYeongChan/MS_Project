import React from "react";
import { WebView } from "react-native-webview";

export default function GoogleMapPicker({ onLocationSelect }) {
  // ** 중요: 'YOUR_Maps_API_KEY' 부분을 실제 구글 지도 API 키로 교체하세요. **
  // 이곳에 본인의 API 키를 입력하세요.
  const googleMapsApiKey = ""; // 이곳에 본인의 API 키를 입력하세요.

  const googleMapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <title>Google Map Picker</title>
      <style>html, body, #map {height:100%; width:100%; margin:0; padding:0;}</style>
      <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=ko&callback=initMap"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map;
        var marker;
        var geocoder; // Geocoder 객체 추가

        function initMap() {
          try {
            // 지도 초기화
            map = new google.maps.Map(document.getElementById('map'), {
              center: {lat: 37.5665, lng: 126.9780}, // 기본 중심 좌표: 서울 시청
              zoom: 15, // 초기 줌 레벨
              disableDefaultUI: true // 기본 UI (줌 버튼, 스트리트 뷰 등) 비활성화 (선택 사항)
            });

            // 마커 생성 및 지도에 추가
            marker = new google.maps.Marker({
              position: {lat: 37.5665, lng: 126.9780}, // 마커 초기 위치
              map: map // 마커를 표시할 지도
            });

            // Geocoder 서비스 초기화
            geocoder = new google.maps.Geocoder();

            // 지도 클릭 이벤트 리스너 추가
            map.addListener('click', function(e) {
              var latLng = e.latLng; // 클릭한 위치의 위경도 좌표
              marker.setPosition(latLng); // 마커 위치 이동

              // 클릭한 위치의 좌표로 주소 정보 요청
              geocoder.geocode({'location': latLng}, function(results, status) {
                if (status === 'OK') {
                  if (results[0]) {
                    // 주소 정보와 함께 위치 데이터 전송
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      lat: latLng.lat(),
                      lng: latLng.lng(),
                      address: results[0].formatted_address // 가장 정확한 주소 형식 (한국어 주소)
                    }));
                  } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      lat: latLng.lat(),
                      lng: latLng.lng(),
                      address: '주소를 찾을 수 없습니다.'
                    }));
                  }
                } else {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    lat: latLng.lat(),
                    lng: latLng.lng(),
                    address: 'Geocoding 실패: ' + status
                  }));
                }
              });
            });

          } catch (e) {
            // 오류 발생 시 React Native로 메시지 전송
            window.ReactNativeWebView.postMessage("구글 지도 초기화 오류: " + e.message);
          }
        }
      </script>
    </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: googleMapHTML }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          onLocationSelect(data);
        } catch (e) {
          console.log("웹뷰 디버깅 메시지:", event.nativeEvent.data);
        }
      }}
      style={{ width: "100%", height: 300 }}
    />
  );
}