import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../../style/AdminStyle';

export default function AdminRankingContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>순위표 조회 페이지입니다</Text>
    </View>
  );
}