import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator, 
  ScrollView, 
  RefreshControl, 
  Dimensions,
  TouchableOpacity,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

export default function QrTab({ patientData, onRefreshData, isLoading }) {
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const abhaAddress = patientData?.abha_id || patientData?.abha_address || patientData?.abha || null;
  const patientName = patientData?.name || "Patient Profile";

  const showToast = () => {
    setToastVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, 2000);
    });
  };

  const copyToClipboard = async () => {
    if (abhaAddress) {
      await Clipboard.setStringAsync(abhaAddress);
      showToast();
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setRefreshing(true);
    try {
      await onRefreshData();
    } catch (error) {
      console.error("QR Tab sync failure:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Feature 1 & 5: Absolute Guard for blank screen / missing profile initialization
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Syncing AMR credentials...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#007AFF']} tintColor="#007AFF" />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Universal Pharmacy QR</Text>
          <Text style={styles.subtitle}>
            Present this single QR code at the counter. The pharmacy scanner retrieves all your active, undispensed AMR prescriptions instantly.
          </Text>
        </View>

        <View style={styles.qrCard}>
          {abhaAddress ? (
            <View style={styles.qrWrapper}>
              <QRCode value={abhaAddress} size={width * 0.55} color="#1C1C1E" backgroundColor="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.errorWrapper}>
              <Text style={styles.errorText}>No Profile Data Found</Text>
              <Text style={styles.errorSubtext}>Pull down to retry or sync your ABHA account via Settings.</Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.patientName}>{patientName}</Text>
            
            {/* Feature 7: Tap to Copy Component */}
            {abhaAddress && (
              <TouchableOpacity style={styles.copyBadge} onPress={copyToClipboard} activeOpacity={0.7}>
                <Text style={styles.abhaText}>ABHA: {abhaAddress}</Text>
                <Text style={styles.copyHint}>📋 Tap to Copy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Feature 4: Lightweight, polished in-app Toast Overlay instead of native popups */}
        {toastVisible && (
          <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
            <Text style={styles.toastText}>✓ ABHA Address copied to clipboard!</Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  headerContainer: { width: '100%', marginBottom: 25 },
  title: { fontSize: 26, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#636366', lineHeight: 20 },
  qrCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 3 },
  qrWrapper: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  errorWrapper: { height: width * 0.55, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#FF3B30', marginBottom: 4 },
  errorSubtext: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
  infoContainer: { marginTop: 20, alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 16 },
  patientName: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  copyBadge: { backgroundColor: '#F2F2F7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', width: '100%' },
  abhaText: { fontSize: 14, color: '#3A3A3C', fontWeight: '500' },
  copyHint: { fontSize: 11, color: '#007AFF', marginTop: 4, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 30, backgroundColor: '#1C1C1E', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, zIndex: 999 },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' }
});