import React from 'react';
import { appEvents, EVENTS } from '../../utils/eventBus'; // 경로 확인
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../../utils/config';
import { api } from '../../auth/api';
import { Ionicons } from '@expo/vector-icons'; // 아이콘 사용
import { useRoute } from '@react-navigation/native';

const ImageCarousel = ({ images, onImagePress }) => {
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
                    <TouchableOpacity
                        key={index}
                        activeOpacity={0.9}
                        onPress={() => onImagePress?.(img.uri)}
                        style={{ width: imageWidth }}
                    >
                        <Image
                            source={{ uri: img.uri }}
                            style={[styles.modalImage, { width: imageWidth }]}
                        />
                    </TouchableOpacity>
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

    const route = useRoute();
    const hasOpenedRef = useRef(false); // 중복 오픈 방지
    const prevIdRef = useRef(null);
    const openReportId = route.params?.openReportId;

    useEffect(() => {

        // 새 알림으로 다른 openReportId가 오면 게이트 리셋
        if (openReportId && prevIdRef.current !== String(openReportId)) {
            prevIdRef.current = String(openReportId);
            hasOpenedRef.current = false;
        }

        if (!openReportId || !reports?.length || hasOpenedRef.current) return;

        // 현재 리스트에서 먼저 찾아보고
        const found = reports.find(r => String(r.id) === String(openReportId));
        if (found) {
            hasOpenedRef.current = true;
            openDetailModal(found);
            return;
        }

        // 리스트에 없다면 단건 상세를 가져와 리스트에 추가 후 오픈
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/report_details/${openReportId}?ts=${Date.now()}`, {
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                });
                if (!res.ok) return; // 실패면 조용히 무시(다음 focus에서 목록으로 보이게)
                const detail = await res.json();

                // 리스트 카드 형태에 맞게 변환(당신의 리스트 스키마에 맞춰 매핑)
                const asRow = {
                    id: detail.report_id,
                    location: detail.location_description,
                    date: (detail.report_date || '').slice(0, 10),
                    user_id: detail.user_id,
                    is_normal: detail.is_normal ?? 0,
                    repair_status: detail.repair_status ?? 0,
                    photo_url: detail.photo_url || null,
                };

                setReports(prev => {
                    // 중복 방지
                    if (prev.some(r => String(r.id) === String(asRow.id))) return prev;
                    // 상단에 끼워넣기(날짜 구분 로직이 있다면 정렬/그룹은 필요시 조정)
                    return [asRow, ...prev];
                });

                hasOpenedRef.current = true;
                openDetailModal({ id: asRow.id }); // openDetailModal에서 /report_details 재호출하므로 id만 넘겨도 OK(아래 참고)
            } catch (e) {
                // 실패 시엔 그냥 목록 그대로(다음 focus 때 갱신될 것)
            }
        })();
    }, [openReportId, reports]);

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [damageStatusInModal, setDamageStatusInModal] = useState(null);
    const [repairStatusInModal, setRepairStatusInModal] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [previewUri, setPreviewUri] = useState(null);
    const [filterDamageOnly, setFilterDamageOnly] = useState(false); // 파손만 보기 (is_normal === 0)
    const [filterRepairPendingOnly, setFilterRepairPendingOnly] = useState(false); // 수리 대기만 보기 (repair_status === 0)

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE_URL}/admin/all_reports?ts=${Date.now()}`; // ← 캐시버스터
            const res = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache',  // 캐시 방지 시도
                    Pragma: 'no-cache',
                },
            });
            if (!res.ok) throw new Error('bad response');

            const data = await res.json();

            // API가 { result: [...] } 형태일 수 있어서 안전하게 추출
            let list = Array.isArray(data) ? data : (Array.isArray(data.result) ? data.result : []);

            // 로컬 필터 적용 (클라이언트 사이드)
            let filtered = list;
            if (filterDamageOnly) {
                filtered = filtered.filter(r => String(r.IS_NORMAL ?? r.is_normal ?? r.isNormal ?? '') === '0');
            }
            if (filterRepairPendingOnly) {
                filtered = filtered.filter(r => String(r.REPAIR_STATUS ?? r.repair_status ?? r.repairStatus ?? '') === '0');
            }

            setReports(filtered);
        } catch (e) {
            Alert.alert("오류", "신고 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 화면이 포커스될 때
    useFocusEffect(useCallback(() => { fetchAllReports(); }, []));

    // 필터가 바뀔 때(화면이 이미 열려있으면 즉시 반영)
    useEffect(() => {
        fetchAllReports();
    }, [filterDamageOnly, filterRepairPendingOnly]);

    const openDetailModal = (report) => {
        setModalVisible(false); // 기존 모달 닫기
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
                            "title": "[수리 완료 알림]",
                            "body": "신고하셨던 공공기물의 수리가 완료되었어요!",
                            "data": {
                                "screen": "MyReportsScreen"
                            }
                        },
                        "msg2":{
                            "title": "[수리 완료 알림]",
                            "body": "동네 공공기물의 수리가 완료되었어요!",
                            "data": {
                                "screen": "DamageMapScreen",
                            }
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

    const images = [];
    if (selectedReport?.photo_url) {
        images.push({
            uri: `${API_BASE_URL}/registration_photos/${selectedReport.photo_url}`,
            label: '원본'
        });
    }
    if (selectedReport?.mask_url) {
        images.push({
            uri: String(selectedReport.mask_url).startsWith('http') ? String(selectedReport.mask_url) : `${API_BASE_URL}/${String(selectedReport.mask_url).replace(/^\/+/, '')}`,
            label: 'AI 분석'
        });
    }

    const openImagePreview = (uri) => {
        setPreviewUri(uri);
        setImagePreviewVisible(true);
    };
    const closeImagePreview = () => {
        setImagePreviewVisible(false);
        setPreviewUri(null);
    };

    // toggle handlers (토글 시 바로 fetchAllReports가 호출되도록 상태 의존성에 useFocusEffect 사용)
    const toggleFilterDamageOnly = () => {
        setFilterDamageOnly(prev => !prev);
    };
    const toggleFilterRepairPendingOnly = () => {
        setFilterRepairPendingOnly(prev => !prev);
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>신고 내역 관리</Text>

                <TouchableOpacity onPress={fetchAllReports} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={26} color="#436D9D" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity style={[styles.filterButton, filterDamageOnly && styles.filterButtonActive]} onPress={toggleFilterDamageOnly}>
                    <View style={[styles.filterCheckbox, filterDamageOnly && styles.filterCheckboxChecked]}>
                        {filterDamageOnly ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={[styles.filterLabel, filterDamageOnly && styles.filterLabelActive]}>파손만 보기</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.filterButton, filterRepairPendingOnly && styles.filterButtonActive]} onPress={toggleFilterRepairPendingOnly}>
                    <View style={[styles.filterCheckbox, filterRepairPendingOnly && styles.filterCheckboxChecked]}>
                        {filterRepairPendingOnly ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={[styles.filterLabel, filterRepairPendingOnly && styles.filterLabelActive]}>수리 대기만 보기</Text>
                </TouchableOpacity>
            </View>

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

                                    <View style={styles.infoSection}>
                                        {/* 이미지 스크롤바 */}
                                        <ImageCarousel images={images} onImagePress={openImagePreview} />

                                        {/* 신고 내용 */}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>신고 내용: </Text>
                                            <Text style={styles.infoValue}>{selectedReport?.details || "신고 내용 없음"}</Text>
                                        </View>

                                        {/* 신고 날짜 */}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>신고 날짜: </Text>
                                            <Text style={styles.infoValue}>{selectedReport?.report_date || selectedReport?.date || "날짜 정보 없음"}</Text>
                                        </View>
                                        {/* 신고자 */}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>신고자: </Text>
                                            <Text style={styles.infoValue}>{selectedReport?.user_id || selectedReport?.nickname || "익명"}</Text>
                                        </View>
                                        {/* 현재 상태 */}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>현재 상태: </Text>
                                            <Text style={styles.infoValue}>
                                                {selectedReport?.repair_status === 1 ? "수리 완료" : "수리 대기"}
                                            </Text>
                                        </View>
                                        {/* AI 분석 결과 */}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>AI 분석 결과: </Text>
                                            <Text style={styles.infoValue}>{selectedReport?.ai_status === '분류불가' ? selectedReport?.caption_ko : selectedReport?.ai_status}</Text>
                                        </View>
                                    </View>
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
                                </ScrollView>
                            </>
                        ) : null}
                    </View>
                </View>
            </Modal>
            {/* 이미지 단독 팝업 */}
            <Modal
                visible={imagePreviewVisible}
                transparent
                animationType="fade"
                onRequestClose={closeImagePreview}
            >
                <View style={styles.imagePreviewOverlay}>
                    <TouchableOpacity style={styles.imagePreviewClose} onPress={closeImagePreview} hitSlop={{top:10,left:10,right:10,bottom:10}}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>

                    {previewUri ? (
                        <Image
                            source={{ uri: previewUri }}
                            style={styles.imagePreview}
                            resizeMode="contain"
                        />
                    ) : null}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingHorizontal: 15, backgroundColor: '#f5f5f5', },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 28, fontWeight: 'bold', flex: 1 },
    refreshButton: { padding: 6, marginLeft: 8 },
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
    infoSection: { marginVertical: 15 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoLabel: { fontWeight: 'bold', color: '#436D9D', fontSize: 15, minWidth: 90 },
    infoValue: { fontSize: 15, color: '#333', flexShrink: 1 },
    imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, },
    imagePreview: { width: '100%', height: '85%', borderRadius: 8, backgroundColor: '#000', },
    imagePreviewClose: { position: 'absolute', top: 36, left: 18, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 20, },
    // filter container styles
    filterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderWidth: 1, borderRadius: 8, padding: 6, marginBottom: 5, marginRight: '25%' },
    filterButton: { flexDirection: 'row', alignItems: 'center', marginRight: 16, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
    filterButtonActive: { backgroundColor: '#e6f0ff', borderRadius: 8 },
    filterCheckbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 6, justifyContent: 'center', alignItems: 'center' },
    filterCheckboxChecked: { backgroundColor: '#436D9D', borderColor: '#436D9D' },
    filterLabel: { fontSize: 13, color: '#333' },
    filterLabelActive: { color: '#436D9D', fontWeight: '600' },
});