import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';

const HOSPITALS = [
  {
    name: 'Kaveri Hospital',
    type: 'Private Hospital',
    phone: '04344223344',
    website: 'https://www.kauveryhospital.com',
  },
  {
    name: 'Government Hospital, Hosur',
    type: 'Government Hospital',
    phone: '04344222100',
    website: 'https://www.tn.gov.in',
  },
  {
    name: 'Thulasi Clinic & Pharmacy',
    type: 'Clinic + Pharmacy',
    phone: '04344255566',
    website: 'https://www.practo.com',
  },
];

export default function BookTab() {
  const call = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Could not open dialer')
    );
  };

  const openSite = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open website')
    );
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Book an Appointment</Text>
      <Text style={styles.helper}>
        Choose a hospital and connect directly — call to book, or use their website.
      </Text>

      {HOSPITALS.map((h) => (
        <View key={h.name} style={styles.card}>
          <Text style={styles.name}>{h.name}</Text>
          <Text style={styles.type}>{h.type}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.callButton} onPress={() => call(h.phone)}>
              <Text style={styles.buttonText}>📞 Call to Book</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.webButton} onPress={() => openSite(h.website)}>
              <Text style={styles.buttonText}>🌐 Website</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
  helper: { fontSize: 13, color: '#777', marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0d7377' },
  type: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  callButton: { flex: 1, backgroundColor: '#0d7377', borderRadius: 10, padding: 12, alignItems: 'center' },
  webButton: { flex: 1, backgroundColor: '#14a1a6', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});