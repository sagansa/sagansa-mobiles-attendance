import { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Tenant {
    id: string;
    name: string;
    is_primary: boolean;
    is_owner: boolean;
    role?: string;
}

export default function TenantSelectionScreen() {
    const router = useRouter();
    const { token } = useAuth(); // Get token from Auth context
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        if (token) {
            loadTenants();
        }
    }, [token]);

    async function loadTenants() {
        try {
            setLoading(true);
            setError(null);

            // Use context token or fallback to AsyncStorage
            let authToken = token;
            if (!authToken) {
                try {
                    authToken = await AsyncStorage.getItem('@presence/auth-token');
                } catch {}
            }

            if (!authToken) {
                setError('Token tidak ditemukan. Silakan login ulang.');
                return;
            }

            const data = await apiFetch<{ success: boolean; tenants: Tenant[] }>('/tenants/accessible', {
                method: 'GET',
                token: authToken,
            });
            console.log('✅ Tenants response:', data);

            if (data.success && data.tenants) {
                setTenants(data.tenants);
                console.log(`📊 Found ${data.tenants.length} tenant(s)`);

                // If only one tenant, auto-select and proceed
                if (data.tenants.length === 1) {
                    console.log('🎯 Auto-selecting single tenant:', data.tenants[0].name);
                    await selectTenant(data.tenants[0]);
                }
            } else {
                console.error('❌ Invalid response format:', data);
                setError('Gagal memuat daftar tenant');
            }
        } catch (err) {
            console.error('❌ Load tenants error:', err);
            setError('Terjadi kesalahan saat memuat tenant: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }

    async function selectTenant(tenant: Tenant) {
        try {
            setSelecting(true);

            // Save selected tenant to AsyncStorage
            await AsyncStorage.setItem('active_tenant_id', tenant.id);
            await AsyncStorage.setItem('active_tenant_name', tenant.name);

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (err) {
            setError('Gagal memilih tenant');
            console.error('Select tenant error:', err);
        } finally {
            setSelecting(false);
        }
    }

    function renderTenant({ item }: { item: Tenant }) {
        return (
            <TouchableOpacity
                style={styles.tenantCard}
                onPress={() => selectTenant(item)}
                disabled={selecting}
            >
                <View style={styles.tenantHeader}>
                    <Text style={styles.tenantName}>{item.name}</Text>
                    {item.is_primary && (
                        <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Utama</Text>
                        </View>
                    )}
                </View>

                <View style={styles.tenantMeta}>
                    <Text style={styles.tenantRole}>
                        {item.is_owner ? 'Pemilik' : item.role || 'Karyawan'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1D4ED8" />
                <Text style={styles.loadingText}>Memuat tenant...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadTenants}>
                    <Text style={styles.retryButtonText}>Coba Lagi</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pilih Tenant</Text>
                <Text style={styles.subtitle}>
                    Pilih tenant yang ingin Anda gunakan
                </Text>
            </View>

            <FlatList
                data={tenants}
                renderItem={renderTenant}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
            />

            {selecting && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    header: {
        padding: 24,
        paddingTop: 64,
        paddingBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    listContent: {
        padding: 24,
        paddingTop: 8,
    },
    tenantCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tenantHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tenantName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    primaryBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    primaryBadgeText: {
        color: '#1E40AF',
        fontSize: 12,
        fontWeight: '600',
    },
    tenantMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tenantRole: {
        fontSize: 14,
        color: '#6B7280',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    errorText: {
        fontSize: 16,
        color: '#DC2626',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#1D4ED8',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
