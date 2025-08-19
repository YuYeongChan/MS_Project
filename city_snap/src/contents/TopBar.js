import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationsPopover from './NotificationsPopover'; 
export default function TopBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <View
        style={{
          paddingTop: 15,
          height: '10%', backgroundColor: '#436D9D',
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', paddingHorizontal: 16
        }}
      >
        <Text
          style={{
            color: '#F9F9F9', fontSize: 25,
            fontFamily: 'PretendardGOV-ExtraBold'
          }}
        >
          City Snap
        </Text>

        <TouchableOpacity onPress={() => setOpen(true)}>
          <Ionicons name="notifications-outline" size={30} color="#F9F9F9" />
        </TouchableOpacity>
      </View>

      {/* 작은 알림 창 */}
      <NotificationsPopover visible={open} onClose={() => setOpen(false)} />
    </>
  );
}