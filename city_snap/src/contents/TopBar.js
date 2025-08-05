import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function TopBar() {
    return (
        <View 
            style={{
                borderColor: '#E0E0E0', paddingTop: 15,
                height: '10%', backgroundColor: '#F9F9F9',
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', paddingHorizontal: 16
            }}
        >
            <Text 
                style={{
                    color: '#436D9D', fontSize: 25,
                    fontFamily: 'PretendardGOV-ExtraBold'
                }}
            >
                City Snap
            </Text>
            <TouchableOpacity onPress={() => {alert("알림 조회")}}>
                <Image
                    source={require('./img/bell_notifi_icon.png')}
                    style={{width: 35, height: 35}}
                />
            </TouchableOpacity>
        </View>
    );
}