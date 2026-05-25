import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { UserMenu } from '@/components/UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { fetchLeaveRequests, LeaveRequest } from '@/lib/api';

export default function LeaveScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadLeaveRequests = async () => {
        if (!token) return;

        try {
            const response = await fetchLeaveRequests(token);
            setLeaveRequests(response.data || []);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            void loadLeaveRequests();
        }, [token])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        void loadLeaveRequests();
    };

    const handleAddLeave = () => {
        router.push('/leave-request');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10B981';
            case 'rejected': return '#EF4444';
            default: return '#F59E0B';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'approved': return 'Disetujui';
            case 'rejected': return 'Ditolak';
            default: return 'Menunggu';
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'annual': return 'Tahunan';
            case 'sick': return 'Sakit';
            case 'emergency': return 'Darurat';
            default: return type;
        }
    };

    const renderLeaveItem = ({ item }: { item: LeaveRequest }) => {
        const startDate = format(parseISO(item.start_date), 'd MMM yyyy', { locale: id });
        const endDate = format(parseISO(item.end_date), 'd MMM yyyy', { locale: id });

        return (
            <View style={styles.leaveCard}>
                <View style={styles.leaveHeader}>
                    <View style={styles.leaveInfo}>
                        <Text style={styles.leaveType}>{getTypeText(item.type)}</Text>
                        <Text style={styles.leaveDates}>{startDate} - {endDate}</Text>
                        {item.duration && (
                            <Text style={styles.leaveDuration}>{item.duration} hari</Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                </View>
                {item.reason && (
                    <Text style={styles.leaveReason} numberOfLines={2}>{item.reason}</Text>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Cuti</Text>
                        <Text style={styles.subtitle}>Kelola pengajuan cuti Anda</Text>
                    </View>
                    <UserMenu />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Cuti</Text>
                    <Text style={styles.subtitle}>Kelola pengajuan cuti Anda</Text>
                </View>
                <UserMenu />
            </View>

            <FlatList
                data={leaveRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderLeaveItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Belum ada pengajuan cuti.</Text>
                }
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={handleAddLeave}
                accessibilityLabel="Tambah pengajuan cuti"
            >
                <MaterialIcons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F4F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
    },
    listContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leaveCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    leaveHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    leaveInfo: {
        flex: 1,
    },
    leaveType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    leaveDates: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    leaveDuration: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    leaveReason: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        lineHeight: 20,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 32,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
