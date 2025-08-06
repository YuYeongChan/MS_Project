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
        const testData = [
            { id: 11, title: "맨홀 파손 이유 및 대체 방안", content: "내용", date: "2025-08-05", admin_name: "이길동", type: 1, fixed: false},
            { id: 9, title: "7월 수리 현황", content: "내용", date: "2025-09-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 8, title: "6월 수리 현황", content: "내용", date: "2025-09-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 7, title: "5월 수리 현황", content: "내용", date: "2025-09-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 6, title: "4월 수리 현황", content: "내용", date: "2025-09-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 5, title: "3월 수리 현황", content: "내용", date: "2025-09-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 4, title: "2월 수리 현황", content: "내용", date: "2025-07-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 3, title: "1월 수리 현황", content: "내용", date: "2025-08-01", admin_name: "박길동", type: 2, fixed: false},
            { id: 2, title: "등록 후 처리 과정 안내", content: "내용", date: "2023-10-02", admin_name: "김길동", type: 0, fixed: true},
            { id: 1, title: "업로드 시 주의사항!", content: "내용", date: "2023-10-01", admin_name: "홍길동", type: 0, fixed: true},
        ];
        setNotices(testData);
        setLoading(false);
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
                                        <Text style={styles.noticeDate}>{item.date}</Text>
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
                                        <Text style={styles.noticeDate}>{item.date}</Text>
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
                                    <Text style={styles.modalDate}>{selectedNotice?.date}</Text>
                                </View>
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