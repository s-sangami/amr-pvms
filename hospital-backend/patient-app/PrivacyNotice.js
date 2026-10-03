import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export default function PrivacyNotice({ onBack }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Privacy Notice</Text>
        <Text style={styles.updated}>Last updated: July 2026</Text>

        <Text style={styles.section}>What we collect</Text>
        <Text style={styles.body}>
          MedTrace collects your name, phone number, ABHA ID, and health details you provide
          (age, gender, blood group, height, weight, allergies, chronic conditions, current
          medications, past surgeries, pregnancy status where relevant, and use of traditional
          medicine). We also store your prescription history as issued by doctors and dispensed
          by pharmacies through our connected hospital partners.
        </Text>

        <Text style={styles.section}>Why we collect it</Text>
        <Text style={styles.body}>
          This information is used solely to help doctors prescribe antibiotics safely — checking
          for allergy conflicts, prior antibiotic history, and WHO AWaRe risk classification — and
          to give you and your family visibility into your own prescription history. We do not use
          your data for advertising, and we do not sell your data to any third party.
        </Text>

        <Text style={styles.section}>Who can see your data</Text>
        <Text style={styles.body}>
          Only doctors and pharmacists actively treating you (or your linked family members) can
          view your prescription and health history, through their hospital's secure portal. You
          control what family members can see through the Family tab.
        </Text>

        <Text style={styles.section}>Your rights</Text>
        <Text style={styles.body}>
          You may view, correct, or delete your data at any time. Deleting your account
          permanently removes your profile, prescription history, and family records from our
          systems. This cannot be undone. You can also withdraw consent at any time by deleting
          your account; this does not affect the lawfulness of processing carried out before
          withdrawal.
        </Text>

        <Text style={styles.section}>How long we keep it</Text>
        <Text style={styles.body}>
          We retain your data only as long as your account is active. If you delete your account,
          your personal data is removed from our active systems.
        </Text>

        <Text style={styles.section}>Security</Text>
        <Text style={styles.body}>
          Your password is stored using industry-standard hashing (never in plain text). All
          communication with our servers is encrypted in transit. Access between our services is
          protected by authenticated API keys.
        </Text>

        <Text style={styles.section}>Contact</Text>
        <Text style={styles.body}>
          For any questions about how your data is handled, or to request deletion outside the
          app, please contact the MedTrace project team.
        </Text>

        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f7f7' },
  container: { padding: 24, paddingTop: 50, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d7377', marginBottom: 4 },
  updated: { fontSize: 12, color: '#8a9a9a', marginBottom: 20 },
  section: { fontSize: 15, fontWeight: '700', color: '#0d7377', marginTop: 18, marginBottom: 6 },
  body: { fontSize: 14, color: '#333', lineHeight: 21 },
  backButton: { backgroundColor: '#0d7377', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 30 },
  backButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});