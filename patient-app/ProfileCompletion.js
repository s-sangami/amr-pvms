import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert
} from 'react-native';

export default function ProfileCompletion({ apiBase, token, onDone, existingProfile }) {
  const ep = existingProfile || {};

  const [age, setAge] = useState(ep.age || '');
  const [gender, setGender] = useState(ep.gender || '');
  const [bloodGroup, setBloodGroup] = useState(ep.blood_group || '');
  const [address, setAddress] = useState(ep.address || '');
  const [height, setHeight] = useState(ep.height || '');
  const [weight, setWeight] = useState(ep.weight || '');
  const [allergies, setAllergies] = useState(ep.allergies || '');
  const [conditions, setConditions] = useState(ep.conditions || '');
  const [pregnancyStatus, setPregnancyStatus] = useState(ep.pregnancy_status || '');
  const [pastSurgeries, setPastSurgeries] = useState(ep.past_surgeries || '');
  const [currentMedications, setCurrentMedications] = useState(ep.current_medications || '');
  const [traditionalMedicine, setTraditionalMedicine] = useState(ep.traditional_medicine || '');
  const [loading, setLoading] = useState(false);

  const isEditing = !!existingProfile;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/patient/me/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age, gender, blood_group: bloodGroup, address, height, weight,
          allergies, conditions, pregnancy_status: pregnancyStatus,
          past_surgeries: pastSurgeries, current_medications: currentMedications,
          traditional_medicine: traditionalMedicine,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onDone(data);
      } else {
        Alert.alert('Could not save profile', data.detail || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEditing ? 'Edit Profile' : 'Complete Your Profile'}</Text>
      <Text style={styles.subtitle}>
        {isEditing ? 'Update your details below' : 'Just once — this helps your doctor treat you safely'}
      </Text>

      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.rowButtons}>
        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, gender === g && styles.chipSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Blood Group</Text>
      <TextInput style={styles.input} value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" />

      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Height</Text>
      <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="e.g. 160cm" />

      <Text style={styles.label}>Weight</Text>
      <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="e.g. 55kg" />

      <Text style={styles.label}>Known Allergies</Text>
      <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="comma-separated, or None" />

      <Text style={styles.label}>Chronic Conditions</Text>
      <TextInput style={styles.input} value={conditions} onChangeText={setConditions} placeholder="comma-separated, or None" />

      {gender === 'Female' && (
        <>
          <Text style={styles.label}>Pregnancy Status</Text>
          <View style={styles.rowButtons}>
            {['Yes', 'No'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, pregnancyStatus === v && styles.chipSelected]}
                onPress={() => setPregnancyStatus(v)}
              >
                <Text style={[styles.chipText, pregnancyStatus === v && styles.chipTextSelected]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Past Surgeries</Text>
      <TextInput style={styles.input} value={pastSurgeries} onChangeText={setPastSurgeries} placeholder="or None" />

      <Text style={styles.label}>Current Medications</Text>
      <TextInput style={styles.input} value={currentMedications} onChangeText={setCurrentMedications} placeholder="or None" />

      <Text style={styles.label}>Currently taking Siddha, Ayurvedic, Homeopathic, or other traditional medicine?</Text>
      <View style={styles.rowButtons}>
        {['Yes', 'No'].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, traditionalMedicine === v && styles.chipSelected]}
            onPress={() => setTraditionalMedicine(v)}
          >
            <Text style={[styles.chipText, traditionalMedicine === v && styles.chipTextSelected]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#f0f7f7', paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d7377', marginTop: 30, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#cde' },
  rowButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#cde' },
  chipSelected: { backgroundColor: '#0d7377', borderColor: '#0d7377' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  submitButton: { backgroundColor: '#0d7377', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 30 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});