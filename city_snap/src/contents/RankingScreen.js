import React, { useEffect, useState } from 'react';
import { Alert, View, Text, FlatList, Image, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt_decode from 'jwt-decode';
import { API_BASE_URL } from '../utils/config';
import { styles } from '../style/RankingStyle';

export default function RankingScreen() {
  const [userInfo, setUserInfo] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 사용자 정보 로드
    const loadUserInfo = async () => {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            try {
              const decoded = jwt_decode(token);
              setUserInfo(decoded);
            } catch (error) {
              console.error('토큰 디코딩 오류:', error);
            }
          }
        };
    loadUserInfo();

    // 서버에서 랭킹 데이터 가져오기
    fetch(`${API_BASE_URL}/account.ranking`)
      .then((response) => response.json())
      .then(data => {
        // data가 문자열 형태의 JSON일 경우 한 번 더 파싱
        let parsed;
        if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          parsed = data;
        }
        setRanking(parsed.ranking || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 로그인한 사용자가 랭킹에 포함되어 있는지 확인
  const myRank = (ranking && userInfo) ? ranking.findIndex(item => item.user_id === userInfo.user_id) : -1;
  // 내 정보가 랭킹에 없을 경우 기본값 설정
  const myInfo = myRank !== -1 ? ranking[myRank] : userInfo;

  // 랭킹 아이템 렌더링 함수
  const renderItem = ({ item, index }) => (
    <View style={styles.item}>
      <Text style={styles.rank}>{item.rank}</Text>
      <Image source={{ uri: `${API_BASE_URL}/profile_photos/${item.profile_pic_url}` }} style={styles.avatar}/>
      <Text style={styles.nickname}>{item.nickname}</Text>
      <Text style={styles.score}>{item.score}</Text>
    </View>
  );

  return (
    <View style={ styles.container }>
      <Text style={ styles.title }>전체 순위</Text>
      {loading ? (
        <ActivityIndicator size="large" /> // 로딩 중 표시
      ) : (
        // 랭킹 데이터가 로드되면 FlatList로 표시
        <FlatList
          data={ranking}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.user_id ? item.user_id.toString() : index.toString()}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* 내 정보는 항상 하단에 고정 */}
      <View>
        <Text>
          {myRank !== -1 ? `내 순위: ${myRank + 1}` : '순위권 외'}
          {/* 내 순위: 1 */}
        </Text>
        {userInfo && (
          <View style={styles.myInfoContainer}>
            <Image source={{ uri: `${API_BASE_URL}/profile_photos/${userInfo.profile_pic_url}` }} style={styles.avatar}/>
            <Text style={styles.nickname}>{userInfo.nickname}</Text>
            <Text style={styles.score}>{userInfo.score}</Text>
          </View>
        )}
      </View>
    </View>
  );
}