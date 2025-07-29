import React, { useState, useEffect } from "react";
import { 
    View, 
    Text, 
    ActivityIndicator, 
    StyleSheet, 
    Alert, 
    TouchableOpacity, 
    Platform, 
} from "react-native";
import { WebView } from "react-native-webview";
// import AsyncStorage from '@react-native-async-storage/async-storage'; // ❌ AsyncStorage 임포트 제거
import { API_BASE_URL, googleMapsApiKey } from '../utils/config'; // ✅ 경로 확인

export default function DamageMapScreen() {
    const [damageLocations, setDamageLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDamageLocations();
    }, []);

    const fetchDamageLocations = async () => { /* ... 기존 코드 유지 ... */
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/get_all_damage_reports`, {});
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

    const generateMapHtml = (locations) => { /* ... 기존 코드 유지 ... */
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
                      zoom: 25,
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
                    // ✅ WebView가 터치 이벤트를 완전히 막지 않도록 pointerEvents 설정 (옵션)
                    // 이 경우 지도를 조작할 수 없게 되므로, 지도 위에 버튼만 있다면 고려.
                    // pointerEvents="none" 
                />
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>등록된 파손 현황이 없습니다.</Text>
                </View>
            )}

            {/* ✅ 지도 닫기 버튼을 별도의 absolute View로 감싸고 zIndex를 명확히 함 */}
            <View style={styles.closeButtonContainer}>
                <TouchableOpacity 
                    style={styles.closeMapButton} 
                    onPress={() => {
                        console.log("닫기 버튼 눌림!"); 
                        console.log("뒤로 갈 수 있는지:", navigation.canGoBack()); 

                        if (navigation.canGoBack()) {
                            navigation.goBack(); 
                        } else {
                            Alert.alert("알림", "더 이상 뒤로 갈 화면이 없습니다. (내비게이션 스택 문제)");
                            console.log("내비게이션 스택에 뒤로 갈 화면이 없습니다.");
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
    container: { 
        flex: 1,
        position: 'relative', // 자식 요소의 absolute positioning 기준
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    noDataContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    noDataText: { 
        fontSize: 18, 
        color: '#555' 
    },
    webView: { 
        flex: 1 
    },
    //  닫기 버튼 컨테이너 스타일 추가
    closeButtonContainer: { 
        position: 'absolute',
        top: 50, // 기존보다 숫자를 높이면 아래로 내려갑니다
        right: 20,
        zIndex: 100, // ✅ WebView보다 훨씬 높은 zIndex로 설정
        // 디버깅을 위해 배경색과 크기를 임시로 설정하여 시각적으로 확인해볼 수 있습니다.
        // backgroundColor: 'rgba(255,0,0,0.5)', 
        // width: 100,
        // height: 40,
    },
    closeMapButton: {
        backgroundColor: 'rgba(0,0,0,0.6)', 
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        // zIndex는 이제 부모 컨테이너에 있으므로 여기서는 필수는 아님
        // zIndex: 10, 
        elevation: 5, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});