import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function PrescriptionDetail({ prescription, onClose }) {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{prescription.drug_name}</Text>
      <Text style={styles.detail}>{prescription.dosage} · {prescription.duration_days} days</Text>
      {prescription.doctor_name ? (
        <Text style={styles.metaText}>Prescribed by {prescription.doctor_name}</Text>
      ) : null}
      {prescription.hospital_name ? (
        <Text style={styles.metaText}>{prescription.hospital_name}</Text>
      ) : null}
      <Text style={styles.metaText}>
        {prescription.created_at
          ? new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          : ''}
      </Text>

      {prescription.not_recommended ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⛔ WHO: Not Recommended combination</Text>
        </View>
      ) : null}
      {prescription.allergy_conflict ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Conflicts with your recorded allergies</Text>
        </View>
      ) : null}

      <Text style={styles.hint}>
        Use the QR tab to show your pharmacy QR — it lists all your active prescriptions, including this one.
      </Text>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#f0f7f7' },
  container: { padding: 24, alignItems: 'center', paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d7377', marginTop: 40 },
  detail: { fontSize: 14, color: '#666', marginTop: 4 },
  metaText: { fontSize: 13, color: '#8a9a9a', marginTop: 2 },
  hint: { fontSize: 13, color: '#8a9a9a', textAlign: 'center', marginTop: 30, maxWidth: 260 },
  closeButton: { marginTop: 30, padding: 12 },
  closeText: { color: '#0d7377', fontWeight: '600' },
  warningBanner: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#f0c0c0', width: '100%' },
  warningText: { color: '#c0392b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});