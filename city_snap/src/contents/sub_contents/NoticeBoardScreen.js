
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { notice_style } from "../../style/SubStyle";
import { Ionicons } from "@expo/vector-icons";

function NoticeBoardScreen() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // DB에서 공지사항 목록 가져오기 추가 필요
        // fetch("https://your-api-url.com/notice/list")
        //     .then(res => res.json())
        //     .then(data => {
        //         setNotices(data.notices || []);
        //         setLoading(false);
        //     })
        //     .catch(() => setLoading(false));

        // test data
        const testData = [
            { id: 1, title: "공지사항 1", date: "2023-10-01" },
            { id: 2, title: "공지사항 2", date: "2023-10-02" },
            { id: 3, title: "공지사항 3", date: "2023-10-03" },
            { id: 4, title: "공지사항 4", date: "2023-10-04" },
        ];
        setNotices(testData);
        setLoading(false);
        // test data
    }, []);

    return (
        <View style={notice_style.container}> 
            {loading ? (
                <ActivityIndicator size="large" color="#436D9D" />
            ) : (
                notices.length === 0 ? (
                    <Text style={notice_style.emptyText}>공지사항이 없습니다.</Text>
                ) : (
                    <View>
                        {notices.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={notice_style.noticeBox}
                                onPress={() => alert(item.title)}
                            >
                                <Ionicons name="warning" size={24} color="red" />
                                <Text style={notice_style.noticeTitle}>{item.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )
            )}
        </View>
    );
}

export default NoticeBoardScreen;