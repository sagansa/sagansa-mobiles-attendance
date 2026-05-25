import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

import { AttendanceCheckInPayload, AttendanceCheckOutPayload, UploadPhoto } from '@/lib/api';
import { ShiftStoreSummary, StoreSummary } from '@/types/api';

type BaseProps = {
  visible: boolean;
  onClose: () => void;
  stores: StoreSummary[];
  initialStoreId?: string | null;
  isSubmitting: boolean;
};

type CheckInProps = BaseProps & {
  mode: 'check-in';
  shiftStores: ShiftStoreSummary[];
  onSubmit: (payload: AttendanceCheckInPayload) => Promise<void>;
};

type CheckOutProps = BaseProps & {
  mode: 'check-out';
  shiftStores?: ShiftStoreSummary[];
  onSubmit: (payload: AttendanceCheckOutPayload) => Promise<void>;
};

type CheckInOutModalProps = CheckInProps | CheckOutProps;

type LocationCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

function formatCoordinate(value?: number | null) {
  if (typeof value !== 'number') {
    return '—';
  }

  return value.toFixed(5);
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2?: number | null,
  lon2?: number | null,
): number | null {
  if (lat2 === undefined || lon2 === undefined || lat2 === null || lon2 === null) {
    return null;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getMapHtml(lat: number, lng: number, storeLat?: number | null, storeLng?: number | null, radius?: number) {
  const hasStore = storeLat && storeLng;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${lat}, ${lng}], 16);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // User marker (Blue)
          var userIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          L.marker([${lat}, ${lng}], {icon: userIcon}).addTo(map)
            .bindPopup('Lokasi Anda').openPopup();

          // Store marker (Red) and Radius
          ${hasStore ? `
            var storeIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });

            var storeLat = ${storeLat};
            var storeLng = ${storeLng};
            var radius = ${radius || 100};

            L.marker([storeLat, storeLng], {icon: storeIcon}).addTo(map)
              .bindPopup('Lokasi Store');

            L.circle([storeLat, storeLng], {
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 0.1,
              radius: radius
            }).addTo(map);

            // Fit bounds to show both
            var bounds = L.latLngBounds([
              [${lat}, ${lng}],
              [storeLat, storeLng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
          ` : ''}
        </script>
      </body>
    </html>
  `;
}

export function CheckInOutModal(props: CheckInOutModalProps) {
  const { visible, mode, onClose, stores, initialStoreId, isSubmitting } = props;
  const shiftStores = mode === 'check-in' ? props.shiftStores : undefined;
  const submitHandler = props.onSubmit as ((payload: AttendanceCheckInPayload | AttendanceCheckOutPayload) => Promise<void>);

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(initialStoreId ?? null);
  const [selectedShiftStoreId, setSelectedShiftStoreId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<UploadPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isStorePickerVisible, setStorePickerVisible] = useState(false);

  const orderedStores = useMemo(() => {
    if (!location) {
      return stores;
    }

    const scored = stores.map((store) => ({
      store,
      distance: haversineDistance(location.latitude, location.longitude, store.latitude ?? null, store.longitude ?? null),
    }));

    scored.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return scored.map((entry) => entry.store);
  }, [location, stores]);

  const selectedStore = useMemo(() =>
    stores.find(s => s.id === selectedStoreId),
    [stores, selectedStoreId]);

  const distanceToStore = useMemo(() => {
    if (!location || !selectedStore?.latitude || !selectedStore?.longitude) return null;
    return haversineDistance(location.latitude, location.longitude, selectedStore.latitude, selectedStore.longitude);
  }, [location, selectedStore]);

  const isOutOfRange = useMemo(() => {
    if (distanceToStore === null || !selectedStore?.radius) return false;
    return distanceToStore > selectedStore.radius;
  }, [distanceToStore, selectedStore]);

  const isPhotoRequired = mode === 'check-in';
  const isSaveDisabled = isSubmitting || !selectedStoreId || !location || (isPhotoRequired && !photoFile);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setPhotoPreviewUri(null);
      setPhotoFile(null);
      setPhotoError(null);
      setFormError(null);
      setSelectedStoreId(initialStoreId ?? orderedStores[0]?.id ?? null);
      setSelectedShiftStoreId(shiftStores?.[0]?.id ?? null);
      return;
    }

    let isMounted = true;

    const loadLocation = async () => {
      setIsLocating(true);
      setLocationError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          setLocationError('Izin lokasi ditolak. Aktifkan GPS untuk melanjutkan.');
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            accuracy: current.coords.accuracy || 10
          });
        }
      } catch (error) {
        setLocationError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
      } finally {
        if (isMounted) {
          setIsLocating(false);
        }
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const fallbackStoreId = initialStoreId ?? orderedStores[0]?.id ?? null;
      setSelectedStoreId(fallbackStoreId);

      const fallbackShiftId = shiftStores?.[0]?.id ?? null;
      setSelectedShiftStoreId(fallbackShiftId);

      setPhotoPreviewUri(null);
      setPhotoFile(null);
      setFormError(null);
      setPhotoError(null);
    }
  }, [visible, initialStoreId, orderedStores, shiftStores]);

  useEffect(() => {
    if (!visible || !location || !orderedStores.length) {
      return;
    }

    // Always snap to nearest when location is available
    setSelectedStoreId(orderedStores[0].id ?? null);
  }, [visible, location, orderedStores]);

  const handlePickPhotoFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (result.canceled || !result.assets?.length) {
      return false;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return false;
    }

    setPhotoPreviewUri(asset.uri);

    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      setPhotoFile(blob);
      return true;
    }

    setPhotoFile({
      uri: asset.uri,
      name: asset.fileName ?? `attendance-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });

    return true;
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    setPhotoError(null);

    // Web platform - use webcam
    if (Platform.OS === 'web') {
      try {
        // Request webcam permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });

        // Create video element for preview
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Create canvas for capturing
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Wait for video to load
        await new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });

        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Capture frame
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
              return;
            }

            reject(new Error('Gagal mengambil foto dari webcam.'));
          }, 'image/jpeg', 0.8);
        });

        // Stop webcam
        stream.getTracks().forEach(track => track.stop());

        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);

        setPhotoPreviewUri(previewUrl);
        setPhotoFile(blob);

      } catch (error) {
        try {
          const picked = await handlePickPhotoFromLibrary();
          if (!picked) {
            setPhotoError('Ambil foto selfie atau pilih file foto untuk melanjutkan.');
          }
        } catch {
          setPhotoError('Izin webcam diperlukan atau webcam tidak tersedia.');
        }
      }
      return;
    }

    // Mobile platform - use camera
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        setPhotoError('Izin kamera diperlukan untuk mengambil selfie.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: false, // Don't get base64, we'll use the file URI
        allowsEditing: true,
        aspect: [3, 4],
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        setPhotoError('Gagal memproses gambar. Coba ulangi.');
        return;
      }

      setPhotoPreviewUri(asset.uri);
      setPhotoFile({
        uri: asset.uri,
        name: asset.fileName ?? `attendance-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    } catch (error) {
      setPhotoError('Terjadi kesalahan saat membuka kamera.');
    }
  }, [handlePickPhotoFromLibrary]);

  const handleSelectStore = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);

    // If there is only one shift, preselect it to reduce friction.
    if (shiftStores?.length === 1) {
      setSelectedShiftStoreId(shiftStores[0].id);
    }
  }, [shiftStores]);

  const handleSelectShiftStore = useCallback((shiftId: string) => {
    setSelectedShiftStoreId(shiftId);
  }, []);

  const processSubmit = useCallback(async () => {
    try {
      setFormError(null);

      if (mode === 'check-in') {
        if (!selectedShiftStoreId) {
          setFormError('Pilih shift sebelum melanjutkan.');
          return;
        }

        if (!photoFile) {
          setFormError('Ambil foto selfie terlebih dahulu.');
          return;
        }

        const payload: AttendanceCheckInPayload = {
          store_id: selectedStoreId!,
          shift_store_id: selectedShiftStoreId,
          photo: photoFile,
          latitude: location!.latitude,
          longitude: location!.longitude,
          accuracy: location!.accuracy,
        };

        if (__DEV__) {
          console.info('[attendance] submit check-in modal', {
            store_id: payload.store_id,
            shift_store_id: payload.shift_store_id,
            has_photo: Boolean(payload.photo),
            latitude: payload.latitude,
            longitude: payload.longitude,
          });
        }

        await submitHandler(payload);
      } else {
        const payload: AttendanceCheckOutPayload = {
          store_id: selectedStoreId!,
          photo: photoFile || null,
          latitude: location!.latitude,
          longitude: location!.longitude,
          accuracy: location!.accuracy,
        };

        await submitHandler(payload);
      }

      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Terjadi kesalahan. Coba lagi.');
      }
    }
  }, [location, mode, onClose, photoFile, selectedShiftStoreId, selectedStoreId, submitHandler]);

  const handleSubmit = useCallback(async () => {
    if (__DEV__) {
      console.info('[attendance] save pressed', {
        mode,
        selectedStoreId,
        selectedShiftStoreId,
        hasLocation: Boolean(location),
        hasPhoto: Boolean(photoFile),
        isOutOfRange,
      });
    }

    if (!selectedStoreId) {
      setFormError('Pilih store terlebih dahulu.');
      return;
    }

    if (!location) {
      setFormError('Lokasi belum tersedia. Pastikan GPS aktif.');
      return;
    }

    if (!photoFile && mode === 'check-in') {
      setFormError('Ambil foto selfie terlebih dahulu.');
      return;
    }

    if (isOutOfRange) {
      if (Platform.OS === 'web') {
        if (window.confirm(`Peringatan: Anda berada ${Math.round(distanceToStore || 0)}m dari lokasi store (Radius ${selectedStore?.radius}m). Apakah Anda yakin ingin melanjutkan?`)) {
          await processSubmit();
        }
      } else {
        Alert.alert(
          'Di Luar Jangkauan',
          `Anda berada ${Math.round(distanceToStore || 0)}m dari lokasi store (Radius ${selectedStore?.radius}m). Apakah Anda yakin ingin melanjutkan?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Ya, Lanjutkan', onPress: processSubmit }
          ]
        );
      }
      return;
    }

    await processSubmit();
  }, [selectedStoreId, selectedShiftStoreId, location, photoFile, mode, isOutOfRange, processSubmit, distanceToStore, selectedStore?.radius]);

  const title = mode === 'check-in' ? 'Check-in' : 'Check-out';

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.heading}>{title}</Text>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Pilih Store</Text>
            {orderedStores.length === 0 ? (
              <Text style={styles.emptyText}>Store belum tersedia.</Text>
            ) : (
              <View style={styles.selectionList}>
                <TouchableOpacity style={styles.linkButton} onPress={() => setStorePickerVisible(true)}>
                  <Text style={styles.linkButtonText}>Lihat daftar lengkap</Text>
                </TouchableOpacity>
                {orderedStores.map((store) => {
                  const isActive = store.id === selectedStoreId;
                  const details: string[] = [];

                  if (store.address) {
                    details.push(store.address);
                  }

                  if (store.phone) {
                    details.push(store.phone);
                  }

                  if (typeof store.latitude === 'number' && typeof store.longitude === 'number' && location) {
                    const distance = haversineDistance(location.latitude, location.longitude, store.latitude, store.longitude);
                    if (distance !== null) {
                      details.push(`±${Math.round(distance)} m dari posisi Anda`);
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={store.id}
                      style={[styles.optionButton, isActive && styles.optionButtonActive]}
                      onPress={() => handleSelectStore(store.id)}
                    >
                      <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{store.name}</Text>
                      {details.map((detail) => (
                        <Text key={`${store.id}-${detail}`} style={styles.optionDescription}>
                          {detail}
                        </Text>
                      ))}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {mode === 'check-in' && shiftStores ? (
              <>
                <Text style={styles.sectionTitle}>Pilih Shift</Text>
                {shiftStores.length === 0 ? (
                  <Text style={styles.emptyText}>Shift belum tersedia.</Text>
                ) : (
                  <View style={styles.selectionList}>
                    {shiftStores.map((shift) => {
                      const isActive = shift.id === selectedShiftStoreId;
                      return (
                        <TouchableOpacity
                          key={shift.id}
                          style={[styles.optionButton, isActive && styles.optionButtonActive]}
                          onPress={() => handleSelectShiftStore(shift.id)}
                        >
                          <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{shift.name}</Text>
                          <Text style={styles.optionDescription}>
                            {shift.shift_start_time ?? '??'} - {shift.shift_end_time ?? '??'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Lokasi Saat Ini</Text>
            <View style={styles.locationCard}>
              {isLocating ? (
                <View style={styles.locationLoading}>
                  <ActivityIndicator color="#2563EB" />
                  <Text style={styles.locationLoadingText}>Mengambil lokasi...</Text>
                </View>
              ) : (
                <>
                  {location ? (
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationText}>Lat: {formatCoordinate(location.latitude)}</Text>
                      <Text style={styles.locationText}>Lng: {formatCoordinate(location.longitude)}</Text>
                    </View>
                  ) : null}

                  {/* Map View */}
                  {location ? (
                    <View style={styles.mapContainer}>
                      {Platform.OS === 'web' ? (
                        <iframe
                          srcDoc={getMapHtml(
                            location.latitude,
                            location.longitude,
                            selectedStore?.latitude,
                            selectedStore?.longitude,
                            selectedStore?.radius ?? undefined
                          )}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                      ) : (
                        <WebView
                          originWhitelist={['*']}
                          source={{
                            html: getMapHtml(
                              location.latitude,
                              location.longitude,
                              selectedStore?.latitude,
                              selectedStore?.longitude,
                              selectedStore?.radius ?? undefined
                            )
                          }}
                          style={styles.mapWebView}
                        />
                      )}
                    </View>
                  ) : null}

                  {isOutOfRange && (
                    <View style={styles.warningContainer}>
                      <Text style={styles.warningTitle}>⚠️ Di Luar Jangkauan</Text>
                      <Text style={styles.warningText}>
                        Anda berada {Math.round(distanceToStore || 0)}m dari lokasi store.
                        Batas radius adalah {selectedStore?.radius}m.
                      </Text>
                    </View>
                  )}

                  {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Selfie Kehadiran</Text>
            <Pressable style={styles.photoButton} onPress={handleCapturePhoto}>
              <Text style={styles.photoButtonText}>
                {photoPreviewUri
                  ? 'Ulangi Foto Selfie'
                  : Platform.OS === 'web'
                    ? 'Ambil Foto dengan Webcam'
                    : 'Ambil Foto Selfie'
                }
              </Text>
            </Pressable>
            {isPhotoRequired && !photoPreviewUri ? (
              <Text style={styles.helperText}>Foto selfie wajib sebelum check-in.</Text>
            ) : null}
            {photoPreviewUri ? <Image source={{ uri: photoPreviewUri }} style={styles.photoPreview} /> : null}
            {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isSaveDisabled && styles.primaryButtonDisabled, isOutOfRange && styles.primaryButtonWarning]}
              onPress={handleSubmit}
              disabled={isSaveDisabled}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Menyimpan...' : (isOutOfRange ? 'Lanjutkan (Di Luar Area)' : 'Simpan')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal daftar store lengkap */}
      <Modal visible={isStorePickerVisible} animationType="slide" onRequestClose={() => setStorePickerVisible(false)}>
        <View style={styles.storeModalContainer}>
          <View style={styles.storeModalHeader}>
            <Text style={styles.heading}>Daftar Store</Text>
            <TouchableOpacity onPress={() => setStorePickerVisible(false)}>
              <Text style={styles.linkButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.storeModalContent}>
            {orderedStores.map((store) => {
              const isActive = store.id === selectedStoreId;
              const details: string[] = [];
              if (store.address) details.push(store.address);
              if (store.phone) details.push(store.phone);

              return (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.optionButton, isActive && styles.optionButtonActive]}
                  onPress={() => {
                    setSelectedStoreId(store.id);
                    if (shiftStores?.length === 1) {
                      setSelectedShiftStoreId(shiftStores[0].id);
                    }
                    setStorePickerVisible(false);
                  }}
                >
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{store.name}</Text>
                  {details.map((detail) => (
                    <Text key={`${store.id}-${detail}`} style={styles.optionDescription}>
                      {detail}
                    </Text>
                  ))}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  selectionList: {
    gap: 12,
  },
  optionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  optionButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  optionLabelActive: {
    color: '#1D4ED8',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    paddingVertical: 8,
  },
  linkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  linkButtonText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  storeModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
  },
  storeModalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeModalContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  locationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#4B5563',
  },
  locationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapWebView: {
    flex: 1,
  },
  warningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  photoButton: {
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  primaryButtonWarning: {
    backgroundColor: '#DC2626', // Red for warning
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
  },
});
