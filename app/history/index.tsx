import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface AttendanceRecord {
    id: string;
    date: string;
    check_in: string;
    check_out: string | null;
    status: 'present' | 'late' | 'absent';
}

export default function HistoryScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            // TODO: Implement API call
            await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call

            // Mock data
            const mockData: AttendanceRecord[] = Array.from({ length: 10 }).map((_, i) => ({
                id: `hist_${i}`,
                date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
                check_in: '08:00',
                check_out: i === 0 ? null : '17:00',
                status: i % 3 === 0 ? 'late' : 'present',
            }));

            setHistory(mockData);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return '#10b981';
            case 'late': return '#f59e0b';
            case 'absent': return '#ef4444';
            default: return Colors[colorScheme].text;
        }
    };

    const renderItem = ({ item }: { item: AttendanceRecord }) => (
        <View style={[styles.card, { backgroundColor: Colors[colorScheme].background, borderColor: Colors[colorScheme].text }]}>
            <View style={styles.cardHeader}>
                <ThemedText style={styles.date}>{item.date}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <ThemedText style={styles.statusText}>{item.status.toUpperCase()}</ThemedText>
                </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.timeRow}>
                    <ThemedText>Check In:</ThemedText>
                    <ThemedText style={styles.timeValue}>{item.check_in}</ThemedText>
                </View>
                <View style={styles.timeRow}>
                    <ThemedText>Check Out:</ThemedText>
                    <ThemedText style={styles.timeValue}>{item.check_out || '-'}</ThemedText>
                </View>
            </View>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'Riwayat Kehadiran' }} />
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshing={loading}
                    onRefresh={loadHistory}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    date: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardBody: {
        gap: 8,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeValue: {
        fontWeight: '600',
    },
});
