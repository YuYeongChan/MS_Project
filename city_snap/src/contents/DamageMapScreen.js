import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { WebView } from "react-native-webview";
// import AsyncStorage from '@react-native-async-storage/async-storage'; //  AsyncStorage 임포트 제거
import { API_BASE_URL } from '../utils/config'; //  경로 확인

export default function DamageMapScreen() {
    const [damageLocations, setDamageLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const googleMapsApiKey = "AIzaSyDFo43ycPnMtzx6mJU-HbUX71yBtbgpapk"; 

    useEffect(() => {
        fetchDamageLocations();
    }, []);

    const fetchDamageLocations = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/get_all_damage_reports`, {
            });

            const responseData = await response.json();

            if (response.ok) {
                if (responseData.result && Array.isArray(responseData.result)) {
                    setDamageLocations(responseData.result);
                    console.log("Received damage locations data:", responseData.result);
                } else {
                    Alert.alert("데이터 오류", "서버 응답 형식이 올바르지 않습니다.");
                }
            } else {
                Alert.alert("데이터 로드 실패", responseData.error || "파손 현황을 불러오지 못했습니다.");
            }
        } catch (error) {
            console.error("파손 현황 로드 중 오류 발생:", error);
            Alert.alert("오류", "서버와 통신 중 문제가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // generateMapHtml 함수는 변경 없음 (제공해주신 코드 그대로)
    const generateMapHtml = (locations) => {
        const locationsArrayString = JSON.stringify(locations.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude,
            title: loc.address || '주소 정보 없음'
        })));

        return `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
              <title>파손 현황 지도</title>
              <style>html, body, #map {height:100%; width:100%; margin:0; padding:0;}</style>
              <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&language=ko&callback=initMap"></script>
            </head>
            <body>
              <div id="map"></div>
              <script>
                var map;
                var markers = [];
                var infowindow;

                var damageLocations = ${locationsArrayString};

                function initMap() {
                  try {
                    map = new google.maps.Map(document.getElementById('map'), {
                      center: new google.maps.LatLng(37.5665, 126.9780),
                      zoom: 12,
                      disableDefaultUI: false
                    });

                    infowindow = new google.maps.InfoWindow();

                    damageLocations.forEach(function(location) {
                      var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(location.lat, location.lng),
                        map: map,
                        title: location.title
                      });

                      marker.addListener('click', function() {
                        infowindow.setContent(location.title);
                        infowindow.open(map, marker);
                      });

                      markers.push(marker);
                    });

                    if (markers.length > 0) {
                        var bounds = new google.maps.LatLngBounds();
                        for (var i = 0; i < markers.length; i++) {
                            bounds.extend(markers[i].getPosition());
                        }
                        map.fitBounds(bounds);
                    }

                  } catch (e) {
                    window.ReactNativeWebView.postMessage("지도 초기화 오류: " + e.message);
                  }
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
                <Text>파손 현황을 불러오는 중...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {damageLocations.length > 0 ? (
                <WebView
                    originWhitelist={['*']}
                    source={{ html: generateMapHtml(damageLocations) }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onMessage={(event) => {
                        console.log("웹뷰 메시지:", event.nativeEvent.data);
                    }}
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noDataContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noDataText: { fontSize: 18, color: '#555' },
    webView: { flex: 1 }
});