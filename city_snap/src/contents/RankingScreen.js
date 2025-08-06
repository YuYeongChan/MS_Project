import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt_decode from 'jwt-decode';
import { API_BASE_URL } from '../utils/config';
import { styles } from '../style/RankingStyle';
import { useFocusEffect } from '@react-navigation/native';

export default function RankingScreen() {
  const [userInfo, setUserInfo] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRanking, setMyRanking] = useState(null)

  // 페이지 접근 시 순위표 reload
  useFocusEffect(
      useCallback(() => {
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
      }, [])
  );

  useEffect(() => {

    if (!userInfo?.user_id) return;

    // 서버에서 랭킹 데이터 가져오기
    fetch(`${API_BASE_URL}/account.ranking?user_id=${userInfo.user_id}`)
      .then((response) => response.json())
      .then(data => {
        let parsed;
        if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          parsed = data;
        }
        // 현재 사용자의 랭킹
        setMyRanking(parsed.myRanking[0].rank);
        // 전체 중 100명까지의 랭킹
        setRanking(parsed.ranking || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userInfo]);

  // 랭킹 아이템 렌더링 함수
  const renderItem = ({ item, index }) => {

    // 1,2,3등 왕관 추가
    let crownColor = null;
    if (item.rank === 1) crownColor = '#FFD700';
    else if (item.rank === 2) crownColor = '#C0C0C0';
    else if (item.rank === 3) crownColor = '#CD7F32';

    const avatarWithCrown = (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {crownColor && (
          <FontAwesome5 name="crown" size={20} color={crownColor} style={{ position: 'absolute', top: -12, zIndex: 2 }} />
        )}
        <Image source={{ uri: `${API_BASE_URL}/profile_photos/${item.profile_pic_url}` }} style={{ borderWidth: 3, borderColor: crownColor || 'transparent', ...styles.avatar }} />
      </View>
    );

    // 내 정보는 강조 표시
    if (item.user_id === userInfo?.user_id) {
      return (
        <View style={styles.myItem}>
          <Text style={styles.rank}>{item.rank}</Text>
          {avatarWithCrown}
          <Text style={styles.nickname}>{item.nickname}</Text>
          <Text style={styles.myScore}>{item.score}</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.item}>
          <Text style={styles.rank}>{item.rank}</Text>
          {avatarWithCrown}
          <Text style={styles.nickname}>{item.nickname}</Text>
          <Text style={styles.score}>{item.score}</Text>
        </View>
      );
    }
  };

  return (
    <View style={ styles.container }>
      <Text style={ styles.title }>전국 등록왕 순위</Text>
      {loading ? (
        <ActivityIndicator size="large" /> // 로딩 중 표시
      ) : (
        // 랭킹 데이터가 로드되면 FlatList로 표시
        <FlatList
          data={ranking}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.user_id ? item.user_id.toString() : index.toString()}
          contentContainerStyle={{ paddingBottom: 90 }}
        />
      )}

      {/* 내 정보는 항상 하단에 고정 */}
      <View>
        {userInfo && (
          <View style={styles.myInfoContainer}>
            <Text style={styles.myRank}>
              {myRanking}
            </Text>
            <Image source={{ uri: `${API_BASE_URL}/profile_photos/${userInfo.profile_pic_url}` }} style={styles.avatar}/>
            <Text style={styles.nickname}>{userInfo.nickname}</Text>
            <Text style={styles.myScore}>{userInfo.score}</Text>
          </View>
        )}
      </View>
    </View>
  );
}