import React from 'react';
import { appEvents, EVENTS } from '../../utils/eventBus'; // 경로 확인
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../../utils/config';
import { api } from '../../auth/api';

const ImageCarousel = ({ images }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const imageWidth = Dimensions.get('window').width * 0.9 - 40;

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / imageWidth);
        setActiveIndex(index);
    };

    return (
        <View style={styles.carouselContainer}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={{ width: imageWidth }}
            >
                {images.map((img, index) => (
                    <Image key={index} source={{ uri: img.uri }} style={[styles.modalImage, { width: imageWidth }]} />
                ))}
            </ScrollView>
            <View style={styles.badgeContainer}>
                {images.map((img, index) => (
                    <Text key={index} style={[styles.badge, activeIndex === index && styles.badgeActive]}>{img.label}</Text>
                ))}
            </View>
        </View>
    );
};

export default function AdminReportListScreen() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [damageStatusInModal, setDamageStatusInModal] = useState(null);
    const [repairStatusInModal, setRepairStatusInModal] = useState(null);

    const fetchAllReports = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/admin/all_reports`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => setReports(data))
            .catch(() => Alert.alert("오류", "신고 목록을 불러오는 데 실패했습니다."))
            .finally(() => setLoading(false));
    };

    useFocusEffect(useCallback(() => { fetchAllReports(); }, []));

    const openDetailModal = (report) => {
        setModalVisible(true);
        setDetailLoading(true);
        fetch(`${API_BASE_URL}/report_details/${report.id}`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                setSelectedReport(data);
                setDamageStatusInModal(data.is_normal);
                setRepairStatusInModal(data.repair_status);
            })
            .catch(() => {
                Alert.alert("오류", "상세 정보를 불러오는 데 실패했습니다.");
                setModalVisible(false);
            })
            .finally(() => setDetailLoading(false));
    };

    const handleStatusUpdate = async () => {
        if (selectedReport === null) return;

        const formData = new FormData();
        formData.append('is_normal', damageStatusInModal);
        formData.append('repair_status', repairStatusInModal);

        try {
            const response = await fetch(`${API_BASE_URL}/update_report_status/${selectedReport.report_id}`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                Alert.alert("성공", "상태가 업데이트되었습니다.");
                setModalVisible(false);
                fetchAllReports(); // 목록 새로고침

                // 수리 완료로 상태를 변경하였을 시
                if(repairStatusInModal){

                    // 해당 건을 올린 사용자에게 수리 완료 알림
                    // 근처 다른 사용자에게 수리 완료 알림
                    const data = {
                        
                        "user_id" : selectedReport.user_id,
                        "msg1": {
                            "title": "수리 완료 알림",
                            "body": "신고하셨던 공공기물의 수리가 완료되었어요!"
                        },
                        "msg2":{
                            "title": "수리 완료 알림",
                            "body": "동네 공공기물의 수리가 완료되었어요!"
                        }
                    }
                    const res = await api.postJSON("/notification.notify_repair", data);
                }
                
                appEvents.emit(EVENTS.REPORT_STATUS_UPDATED, {
                    reportId: selectedReport.report_id,
                    repairStatus: repairStatusInModal,
                    isNormal: damageStatusInModal,
                    });
            } else {
                const errorData = await response.json();
                Alert.alert("실패", errorData.error || "상태 업데이트에 실패했습니다.");
            }
        } catch (error) {
            Alert.alert("오류", "상태 업데이트 중 오류가 발생했습니다.");
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#436D9D" style={styles.loadingIndicator} />;
    }

    let lastRenderedDate = null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>전체 신고 내역 관리</Text>

            <ScrollView>
                {reports.map(report => {
                    const showDateSeparator = report.date !== lastRenderedDate;
                    if (showDateSeparator) {
                        lastRenderedDate = report.date;
                    }

                    return (
                        <React.Fragment key={report.id}>
                            {showDateSeparator && (
                                <View style={styles.dateSeparator}>
                                    <View style={styles.separatorLine} />
                                    <Text style={styles.separatorText}>{report.date}</Text>
                                    <View style={styles.separatorLine} />
                                </View>
                            )}
                            <TouchableOpacity style={styles.card} onPress={() => openDetailModal(report)}>
                                <Image
                                    source={{ uri: report.photo_url ? `${API_BASE_URL}/registration_photos/${report.photo_url}` : 'https://placehold.co/80x80/eeeeee/cccccc?text=No+Image' }}
                                    style={styles.image}
                                />
                                <View style={styles.info}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{report.location}</Text>
                                    <Text style={styles.cardDate}>{report.date} / 신고자: {report.user_id}</Text>
                                    <View style={styles.statusTags}>
                                        <Text style={[styles.tag, report.is_normal === 1 ? styles.tagNormal : styles.tagDamage]}>
                                            {report.is_normal === 1 ? '정상' : '파손'}
                                        </Text>
                                        <Text style={[styles.tag, report.repair_status === 1 ? styles.tagCompleted : styles.tagPending]}>
                                            {report.repair_status === 1 ? '수리 완료' : '수리 대기'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </React.Fragment>
                    );
                })}
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {detailLoading ? (
                             <ActivityIndicator size="large" color="#436D9D" style={{minHeight: 300}} />
                        ) : selectedReport ? (
                            <>
                                <Text style={styles.modalTitle}>{selectedReport.location_description}</Text>
                                <ScrollView style={styles.modalScrollView}>
                                    {(() => {
                                        const images = [];
                                        if (selectedReport.photo_url) images.push({ uri: `${API_BASE_URL}/registration_photos/${selectedReport.photo_url}`, label: '원본' });


                                        if (images.length > 1) {
                                            return <ImageCarousel images={images} />;
                                        } else if (images.length === 1) {
                                            return <Image source={{ uri: images[0].uri }} style={styles.modalImage} />;
                                        } else {
                                            return <Image source={{ uri: 'https://placehold.co/300x200/eeeeee/cccccc?text=No+Image' }} style={styles.modalImage} />;
                                        }
                                    })()}
                                    <Text style={styles.detailText}><Text style={styles.detailLabel}>신고 내용:</Text> {selectedReport.details}</Text>
                                </ScrollView>

                                <View style={styles.statusUpdateSection}>
                                    <Text style={styles.sectionTitle}>파손 여부</Text>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity
                                            style={[styles.statusButton, damageStatusInModal === 1 && styles.statusButtonActive]}
                                            onPress={() => setDamageStatusInModal(1)}>
                                            <Text style={[styles.statusButtonText, damageStatusInModal === 1 && styles.statusButtonTextActive]}>정상</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.statusButton, damageStatusInModal === 0 && styles.statusButtonActive]}
                                            onPress={() => setDamageStatusInModal(0)}>
                                            <Text style={[styles.statusButtonText, damageStatusInModal === 0 && styles.statusButtonTextActive]}>파손</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.statusUpdateSection}>
                                    <Text style={styles.sectionTitle}>수리 상태</Text>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity
                                            style={[styles.statusButton, repairStatusInModal === 0 && styles.statusButtonActive]}
                                            onPress={() => setRepairStatusInModal(0)}>
                                            <Text style={[styles.statusButtonText, repairStatusInModal === 0 && styles.statusButtonTextActive]}>수리 대기</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.statusButton, repairStatusInModal === 1 && styles.statusButtonActive]}
                                            onPress={() => setRepairStatusInModal(1)}>
                                            <Text style={[styles.statusButtonText, repairStatusInModal === 1 && styles.statusButtonTextActive]}>수리 완료</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                        <Text style={styles.buttonText}>닫기</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveButton} onPress={handleStatusUpdate}>
                                        <Text style={styles.buttonTextWhite}>변경사항 저장</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingHorizontal: 15, backgroundColor: '#f5f5f5', },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, },
    loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3, },
    image: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#EEE", marginRight: 12, },
    info: { flex: 1, justifyContent: "center", },
    cardTitle: { fontSize: 16, fontWeight: "600", color: "#222", marginBottom: 4, },
    cardDate: { fontSize: 12, color: "#888", },
    statusTags: { flexDirection: 'row', marginTop: 10, },
    tag: { fontSize: 12, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, overflow: 'hidden', marginRight: 6, },
    tagDamage: { backgroundColor: '#ffdddd', color: '#c91515' },
    tagNormal: { backgroundColor: '#e0f0e0', color: '#008000' },
    tagPending: { backgroundColor: '#fff0c7', color: '#f5a623' },
    tagCompleted: { backgroundColor: '#d4e4ff', color: '#436D9D' },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 15,},
    separatorLine: { flex: 1, height: 3, backgroundColor: '#436D9D'},
    separatorText: { paddingHorizontal: 12, fontSize: 17, fontWeight: '600', color: '#436D9D'},
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 10, padding: 20, maxHeight: '85%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    modalScrollView: { marginVertical: 15 },
    modalImage: { height: 200, borderRadius: 8, backgroundColor: '#eee', },
    carouselContainer: { height: 230, marginBottom: 15, alignItems: 'center' },
    badgeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8, },
    badge: { fontSize: 12, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#eee', color: '#888', overflow: 'hidden', },
    badgeActive: { backgroundColor: '#436D9D', color: '#fff', },
    detailText: { fontSize: 16, color: '#333', marginBottom: 8, lineHeight: 22 },
    detailLabel: { fontWeight: 'bold' },
    statusUpdateSection: { marginTop: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
    buttonGroup: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10 },
    statusButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
    statusButtonActive: { backgroundColor: '#436D9D', borderColor: '#436D9D' },
    statusButtonText: { color: '#333' },
    statusButtonTextActive: { color: '#fff', fontWeight: 'bold' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
    closeButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, backgroundColor: '#eee' },
    saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, backgroundColor: '#436D9D', marginLeft: 10 },
    buttonText: { color: '#333', fontWeight: 'bold' },
    buttonTextWhite: { color: '#fff', fontWeight: 'bold' },
});