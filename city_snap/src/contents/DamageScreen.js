import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { styles } from '../style/DamageStyle';
import { useNavigation } from '@react-navigation/native';

export default function DamageScreen() {
    const navigation = useNavigation();

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.container}
        > 
            <Text style={styles.sectionTitle}>공공기물 파손 현황 확인</Text>

            <TouchableOpacity
                style={styles.mapBox}
                onPress={() => navigation.navigate("DamageMapScreen")}
                // onPress={() => {alert("파손 현황 지도")}}
            >
                <Text style={styles.mapLabel}>공공기물 파손 현황 지도</Text>
                <Image
                    source={require('./img/map_img.png')}
                    style={styles.mapImage}
                />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>나의 개인 등록 현황</Text>
        </ScrollView>
    );
}