import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isWithinInterval,
    parseISO,
    isBefore,
} from 'date-fns';
import { id } from 'date-fns/locale';

import { useAuth } from '@/hooks/useAuth';
import { submitLeaveRequest } from '@/lib/api';

export default function LeaveRequestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        leave_type: 'annual',
        reason: '',
    });

    const [errors, setErrors] = useState({
        start_date: '',
        end_date: '',
        reason: '',
    });

    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const handleDatePress = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');

        if (!formData.start_date || (formData.start_date && formData.end_date)) {
            // Start new selection
            setFormData({ ...formData, start_date: dateStr, end_date: '' });
        } else {
            // Complete selection
            const start = parseISO(formData.start_date);
            if (isBefore(date, start)) {
                setFormData({ ...formData, start_date: dateStr, end_date: formData.start_date });
            } else {
                setFormData({ ...formData, end_date: dateStr });
            }
        }
        setErrors({ ...errors, start_date: '', end_date: '' });
    };

    const getDayStyle = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isStart = formData.start_date === dateStr;
        const isEnd = formData.end_date === dateStr;
        const isRange = formData.start_date && formData.end_date &&
            isWithinInterval(date, {
                start: parseISO(formData.start_date),
                end: parseISO(formData.end_date)
            });

        if (isStart || isEnd) return styles.daySelected;
        if (isRange) return styles.dayInRange;
        return styles.day;
    };

    const getDayTextStyle = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isStart = formData.start_date === dateStr;
        const isEnd = formData.end_date === dateStr;
        const isRange = formData.start_date && formData.end_date &&
            isWithinInterval(date, {
                start: parseISO(formData.start_date),
                end: parseISO(formData.end_date)
            });

        if (isStart || isEnd) return styles.dayTextSelected;
        if (isRange) return styles.dayTextInRange;

        // Dim days from other months
        if (date.getMonth() !== currentMonth.getMonth()) return styles.dayTextDim;

        return styles.dayText;
    };

    const validate = () => {
        let isValid = true;
        const newErrors = { start_date: '', end_date: '', reason: '' };

        if (!formData.start_date) {
            newErrors.start_date = 'Tanggal mulai harus diisi';
            isValid = false;
        }

        if (!formData.end_date) {
            newErrors.end_date = 'Tanggal selesai harus diisi';
            isValid = false;
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'Alasan cuti harus diisi';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            Alert.alert('Error', 'Mohon lengkapi semua field yang bertanda merah');
            return;
        }

        if (!token) {
            Alert.alert('Error', 'Sesi Anda telah berakhir. Silakan login kembali.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await submitLeaveRequest(token, {
                start_date: formData.start_date,
                end_date: formData.end_date,
                leave_type: formData.leave_type as 'annual' | 'sick' | 'emergency',
                reason: formData.reason,
            });

            setIsSubmitting(false);
            Alert.alert('Sukses', response.message || 'Pengajuan cuti berhasil dikirim', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            // Auto redirect after 1 second if user doesn't click OK
            setTimeout(() => router.back(), 1000);
        } catch (error: any) {
            setIsSubmitting(false);
            const errorMessage = error?.message || 'Gagal mengirim pengajuan cuti';
            Alert.alert('Error', errorMessage);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ajukan Cuti</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Tipe Cuti</Text>
                    <View style={styles.typeContainer}>
                        {['annual', 'sick', 'emergency'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    formData.leave_type === type && styles.typeButtonActive,
                                ]}
                                onPress={() => setFormData({ ...formData, leave_type: type })}
                            >
                                <Text
                                    style={[
                                        styles.typeText,
                                        formData.leave_type === type && styles.typeTextActive,
                                    ]}
                                >
                                    {type === 'annual' ? 'Tahunan' : type === 'sick' ? 'Sakit' : 'Darurat'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Pilih Tanggal</Text>
                    <View style={[styles.calendarContainer, (errors.start_date || errors.end_date) && styles.inputError]}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <MaterialIcons name="chevron-left" size={24} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>
                                {format(currentMonth, 'MMMM yyyy', { locale: id })}
                            </Text>
                            <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <MaterialIcons name="chevron-right" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekHeader}>
                            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                                <Text key={day} style={styles.weekDayText}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {calendarDays.map((day, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={getDayStyle(day)}
                                    onPress={() => {
                                        handleDatePress(day);
                                    }}
                                >
                                    <Text style={getDayTextStyle(day)}>{format(day, 'd')}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    {(errors.start_date || errors.end_date) && (
                        <Text style={styles.errorText}>Mohon pilih rentang tanggal cuti</Text>
                    )}

                    <View style={styles.dateSummary}>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Mulai</Text>
                            <Text style={styles.dateValue}>
                                {formData.start_date ? format(parseISO(formData.start_date), 'dd MMM yyyy', { locale: id }) : '-'}
                            </Text>
                        </View>
                        <MaterialIcons name="arrow-forward" size={20} color="#9CA3AF" />
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Selesai</Text>
                            <Text style={styles.dateValue}>
                                {formData.end_date ? format(parseISO(formData.end_date), 'dd MMM yyyy', { locale: id }) : '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Alasan</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                        placeholder="Tuliskan alasan cuti Anda..."
                        multiline
                        numberOfLines={4}
                        value={formData.reason}
                        onChangeText={(text) => {
                            setFormData({ ...formData, reason: text });
                            if (text.trim()) setErrors({ ...errors, reason: '' });
                        }}
                    />
                    {errors.reason ? <Text style={styles.errorText}>{errors.reason}</Text> : null}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Kirim Pengajuan</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    content: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    typeButtonActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
    },
    typeText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    typeTextActive: {
        color: '#2563EB',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        backgroundColor: '#93C5FD',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    calendarContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    day: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    daySelected: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 20,
    },
    dayInRange: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 0,
    },
    dayText: {
        fontSize: 14,
        color: '#111827',
    },
    dayTextDim: {
        fontSize: 14,
        color: '#D1D5DB',
    },
    dayTextSelected: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    dayTextInRange: {
        fontSize: 14,
        color: '#2563EB',
        fontWeight: '500',
    },
    dateSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dateInfo: {
        flex: 1,
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 1,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
});
