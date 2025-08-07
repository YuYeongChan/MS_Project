import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL, googleMapsApiKey } from "../../utils/config";

export default function AdminDamageContent() {
  const [damageLocations, setDamageLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCenter, setUserCenter] = useState(null);
  const navigation = useNavigation();

  // ✅ 파손 현황 데이터 불러오기
  const fetchDamageLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_all_damage_reports`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.result)) {
        setDamageLocations(data.result);
      } else {
        Alert.alert("데이터 오류", "파손 현황을 불러오지 못했습니다.");
      }
    } catch (err) {
      Alert.alert("통신 오류", "파손 현황 조회 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // ✅ 기본 중심 좌표 설정 (서울 시청)
        setUserCenter({ lat: 37.5665, lng: 126.9780 });

        // ✅ 데이터 불러오기
        await fetchDamageLocations();
      } catch (e) {
        Alert.alert("초기화 실패", "지도를 불러오지 못했습니다.");
      }
    };

    init();
  }, []);

  // ✅ 지도 HTML 생성
  const generateMapHtml = (locations, center) => {
    const locationsArrayString = JSON.stringify(
      locations.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
        address: loc.address,
        details: loc.details,
        date: loc.date,
        nickname: loc.nickname,
        photo_url: `${API_BASE_URL}${loc.photo_url}`,
      }))
    );

    const centerLat = center?.lat || 37.5665;
    const centerLng = center?.lng || 126.9780;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <title>파손 현황 지도</title>
        <style>
          html, body, #map {height:100%; width:100%; margin:0; padding:0;}
          #infoBox {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            padding: 40px 16px 16px;
            box-shadow: 0px 4px 12px rgba(0,0,0,0.25);
            max-width: 300px;
            font-size: 14px;
            display: none;
            z-index: 9999;
            font-family: 'PretendardGOV-Regular', sans-serif;
            line-height: 1.5;
          }
          #infoBox img {
            width: 100%;
            border-radius: 8px;
            margin-top: 10px;
            object-fit: cover;
            max-height: 160px;
          }
          #infoBox .closeBtn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            text-align: center;
            line-height: 22px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0px 2px 6px rgba(0,0,0,0.3);
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

          function showInfoBox(location, marker) {
            infoContent.innerHTML = \`
              <strong>주소:</strong> \${location.address}<br/>
              <strong>세부 내용:</strong> \${location.details}<br/>
              <strong>날짜:</strong> \${location.date}<br/>
              <strong>작성자:</strong> \${location.nickname}<br/>
              <img src="\${location.photo_url}" />
            \`;
            infoBox.style.display = "block";
            map.panTo(marker.getPosition());
          }

          function hideInfoBox() {
            infoBox.style.display = "none";
          }
        </script>
      </body>
      </html>
    `;
  };

  // ✅ 로딩 중
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>지도를 불러오는 중입니다...</Text>
      </View>
    );
  }

  // ✅ 지도 출력
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
    </View>
  );
}

// ✅ 스타일 정의
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noDataContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noDataText: { fontSize: 18, color: "#555" },
  webView: { flex: 1 },
});
