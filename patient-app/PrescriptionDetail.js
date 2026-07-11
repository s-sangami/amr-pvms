import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PrescriptionDetail({ prescription, onClose }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{prescription.drug_name}</Text>
      <Text style={styles.detail}>{prescription.dosage} · {prescription.duration_days} days</Text>
      {prescription.doctor_name ? (
        <Text style={styles.metaText}>Prescribed by {prescription.doctor_name}</Text>
      ) : null}
      {prescription.hospital_name ? (
        <Text style={styles.metaText}>{prescription.hospital_name}</Text>
      ) : null}
      <Text style={styles.hint}>
        Use the QR tab to show your pharmacy QR — it lists all your active prescriptions, including this one.
      </Text>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f0f7f7', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d7377', marginTop: 40 },
  detail: { fontSize: 14, color: '#666', marginTop: 4 },
  metaText: { fontSize: 13, color: '#8a9a9a', marginTop: 2 },
  hint: { fontSize: 13, color: '#8a9a9a', textAlign: 'center', marginTop: 30, maxWidth: 260 },
  closeButton: { marginTop: 30, padding: 12 },
  closeText: { color: '#0d7377', fontWeight: '600' },
});