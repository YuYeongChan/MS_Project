import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from "react-native";
import { styles } from "../style/NoticeBoardStyle";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

function NoticeBoardScreen() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 4;

    useEffect(() => {
        fetch(`${API_BASE_URL}/get_notices`)
            .then((response) => response.json())
            .then(data => {
                let parsed;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                } else {
                    parsed = data;
                }
                console.log(parsed);
                // 공지사항 데이터 설정
                setNotices(parsed);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useFocusEffect(
        useCallback(() => {
            setPage(1); // 화면이 focus 될 때마다 page 초기화
        }, [])
    );

    const fixedNotices = notices.filter(n => n.fixed);
    const normalNotices = notices.filter(n => !n.fixed);
    const totalPages = Math.ceil(normalNotices.length / PAGE_SIZE);
    const pagedNotices = normalNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>공지 사항</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#436D9D" />
            ) : (
                <View>
                    {/* 고정 공지사항 */}
                    {fixedNotices.length > 0 && (
                        <View style={styles.fixedNotices}>
                            {fixedNotices.map(item => {
                                const icon = item.type === 0 ? "warning" : item.type === 1 ? "information-circle" : "checkmark-circle";
                                const iconColor = item.type === 0 ? "#c91515" : item.type === 1 ? "#436D9D" : "#008000";
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.noticeBox}
                                        onPress={() => {
                                            setVisible(true);
                                            setSelectedNotice(item)
                                        }}
                                    >
                                        <Ionicons name="flag" size={20} style={{ marginRight: 8 }} color="#888" />
                                        <Ionicons name={icon} size={24} color={iconColor} />
                                        <Text style={styles.noticeTitle}>{item.title}</Text>
                                        <Text style={styles.noticeDate}>{item.notice_date}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* 일반 공지사항 (페이지네이션) */}
                    {pagedNotices.length === 0 ? (
                        <Text style={styles.emptyText}>공지사항이 없습니다.</Text>
                    ) : (
                        <View>
                            {pagedNotices.map(item => {
                                const icon = item.type === 0 ? "warning" : item.type === 1 ? "information-circle" : "checkmark-circle";
                                const iconColor = item.type === 0 ? "#c91515" : item.type === 1 ? "#436D9D" : "#008000";
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.noticeBox}
                                        onPress={() => {
                                            setVisible(true);
                                            setSelectedNotice(item)
                                        }}
                                    >
                                        <Ionicons name={icon} size={24} color={iconColor} />
                                        <Text style={styles.noticeTitle}>{item.title}</Text>
                                        <Text style={styles.noticeDate}>{item.notice_date}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* 페이지네이션 버튼 */}
                    {totalPages > 1 && (
                        <View style={styles.pageButtonArea}>
                            <TouchableOpacity
                                style={styles.pageButton}
                                disabled={page === 1}
                                onPress={() => setPage(page - 1)}
                            >
                                <Text style={{ color: page === 1 ? '#bbb' : '#436D9D', fontWeight: 'bold' }}>이전</Text>
                            </TouchableOpacity>
                            <Text style={styles.pageButtonText}>{page} / {totalPages}</Text>
                            <TouchableOpacity
                                style={styles.pageButton}
                                disabled={page === totalPages}
                                onPress={() => setPage(page + 1)}
                            >
                                <Text style={{ color: page === totalPages ? '#bbb' : '#436D9D', fontWeight: 'bold' }}>다음</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalContentHeader}>
                                    <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>
                                    
                                </View>
                                <Text style={styles.modalDate}>{selectedNotice?.date}</Text>
                                <Text style={styles.modalAdmin}>작성자: {selectedNotice?.admin_name}</Text>
                                <Text style={styles.modalContentText}>{selectedNotice?.content}</Text>
                                <TouchableOpacity style={styles.modalButton} onPress={() => setVisible(false)}>
                                    <Text style={styles.modalButtonText}>닫기</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </View>
            )}
        </ScrollView>
    );
}

export default NoticeBoardScreen;