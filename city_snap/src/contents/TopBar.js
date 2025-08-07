import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TopBar() {
    return (
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
            <TouchableOpacity onPress={() => {alert("알림 조회")}}>
                <Ionicons 
                    name="notifications-outline" 
                    size={30} 
                    color="#F9F9F9"
                />
            </TouchableOpacity>
        </View>
    );
}