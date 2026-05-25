import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/types/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isRegistering } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name || !email || !password || !passwordConfirmation) {
      setError('Semua kolom wajib diisi.');
      setSuccessMessage(null);
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Konfirmasi kata sandi tidak cocok.');
      setSuccessMessage(null);
      return;
    }

    setError(null);
    try {
      const response = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccessMessage(response.message ?? 'Registrasi berhasil. Silakan masuk untuk melanjutkan.');
      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          const firstError = Object.values(err.details)[0]?.[0];
          setError(firstError ?? err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('Terjadi kesalahan tak terduga. Silakan coba lagi.');
      }
      setSuccessMessage(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Daftar</Text>
          <Text style={styles.subtitle}>Buat akun untuk mulai mencatat presensi.</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nama lengkap</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Nama Lengkap"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nama@perusahaan.com"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Kata sandi</Text>
          <TextInput
            autoCapitalize="none"
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Konfirmasi kata sandi</Text>
          <TextInput
            autoCapitalize="none"
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isRegistering && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Daftar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryAction} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.secondaryActionText}>Sudah punya akun? Masuk</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 16,
  },
  successText: {
    color: '#16A34A',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    marginTop: 16,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
