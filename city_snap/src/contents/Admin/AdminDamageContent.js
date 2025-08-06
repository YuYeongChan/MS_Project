import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../../style/AdminStyle';

export default function AdminDamageContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📌 파손 현황 페이지입니다</Text>
    </View>
  );
}