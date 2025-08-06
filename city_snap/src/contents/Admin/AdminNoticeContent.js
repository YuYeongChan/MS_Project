import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../../style/AdminStyle';

export default function AdminNoticeContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>공지사항 페이지입니다</Text>
    </View>
  );
}