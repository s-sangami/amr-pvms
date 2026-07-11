import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';

// ─── Sub-screen: Prescription detail for a family member ───────────────────
function FamilyPrescriptionDetail({ prescription, onBack }) {
  return (
    <ScrollView style={styles.detailContainer} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.detailTitle}>Prescription Detail</Text>

      <View style={styles.detailCard}>
        <DetailRow label="Drug" value={prescription.drug_name} />
        <DetailRow label="Dosage" value={prescription.dosage} />
        <DetailRow label="Duration" value={prescription.duration_days ? `${prescription.duration_days} days` : null} />
        <DetailRow label="Doctor" value={prescription.doctor_name} />
        <DetailRow label="Hospital" value={prescription.hospital_name} />
        <DetailRow label="Status" value={prescription.status} />
        <DetailRow label="Date" value={new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not specified'}</Text>
    </View>
  );
}

// ─── Sub-screen: Prescription history for a family member ──────────────────
function FamilyHistory({ member, apiBase, token, onBack }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/patient/me/family/${member.id}/prescriptions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setPrescriptions(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (selectedPrescription) {
    return (
      <FamilyPrescriptionDetail
        prescription={selectedPrescription}
        onBack={() => setSelectedPrescription(null)}
      />
    );
  }

  // Group by date
  const byDate = {};
  prescriptions.forEach(p => {
    const d = new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(p);
  });

  return (
    <ScrollView style={styles.detailContainer} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.detailTitle}>{member.name}'s Prescriptions</Text>

      {loading ? (
        <ActivityIndicator color="#0d7377" style={{ marginTop: 30 }} />
      ) : prescriptions.length === 0 ? (
        <Text style={styles.emptyText}>
          {member.id_type !== 'ABHA'
            ? 'Prescription history is only available for members added with an ABHA ID.'
            : 'No prescriptions found for this member.'}
        </Text>
      ) : (
        Object.entries(byDate).map(([date, rxList]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateLabel}>{date}</Text>
            {rxList.map(rx => (
              <TouchableOpacity
                key={rx.id}
                style={styles.rxCard}
                onPress={() => setSelectedPrescription(rx)}
              >
                <Text style={styles.rxDrug}>{rx.drug_name}</Text>
                <Text style={styles.rxMeta}>{rx.doctor_name || 'Unknown doctor'} · {rx.hospital_name || 'Unknown hospital'}</Text>
                <Text style={styles.rxStatus}>{rx.status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Sub-screen: Add / Edit family member ──────────────────────────────────
function FamilyMemberForm({ apiBase, token, existingMember, onDone, onBack }) {
  const em = existingMember || {};
  const isEditing = !!existingMember;

  const [name, setName] = useState(em.name || '');
  const [relation, setRelation] = useState(em.relation || '');
  const [idType, setIdType] = useState(em.id_type || 'ABHA');
  const [idValue, setIdValue] = useState(em.id_value || '');
  const [age, setAge] = useState(em.age || '');
  const [gender, setGender] = useState(em.gender || '');
  const [bloodGroup, setBloodGroup] = useState(em.blood_group || '');
  const [allergies, setAllergies] = useState(em.allergies || '');
  const [conditions, setConditions] = useState(em.conditions || '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !relation || !idValue) {
      return Alert.alert('Missing Fields', 'Name, relation, and ID are required.');
    }
    setLoading(true);
    try {
      // Edit not supported by backend yet — for now always POST (add new)
      const res = await fetch(`${apiBase}/patient/me/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, relation, id_type: idType, id_value: idValue, age, gender, blood_group: bloodGroup, allergies, conditions }),
      });
      const data = await res.json();
      if (res.ok) {
        onDone();
      } else {
        Alert.alert('Error', data.detail || 'Could not save member.');
      }
    } catch (e) {
      Alert.alert('Network Error', String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.detailContainer} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.detailTitle}>{isEditing ? 'Edit Member' : 'Add Family Member'}</Text>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.fieldLabel}>Relation</Text>
      <TextInput style={styles.input} value={relation} onChangeText={setRelation} placeholder="e.g. Mother, Son" />

      <Text style={styles.fieldLabel}>ID Type</Text>
      <View style={styles.rowButtons}>
        {['ABHA', 'Phone', 'Aadhaar'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, idType === t && styles.chipSelected]}
            onPress={() => setIdType(t)}
          >
            <Text style={[styles.chipText, idType === t && styles.chipTextSelected]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>{idType} ID</Text>
      <TextInput style={styles.input} value={idValue} onChangeText={setIdValue} placeholder={idType === 'ABHA' ? '14-digit ABHA number' : idType === 'Phone' ? '10-digit phone' : '12-digit Aadhaar'} keyboardType="number-pad" />

      <Text style={styles.fieldLabel}>Age</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" />

      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.rowButtons}>
        {['Male', 'Female', 'Other'].map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, gender === g && styles.chipSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Blood Group</Text>
      <TextInput style={styles.input} value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" />

      <Text style={styles.fieldLabel}>Known Allergies</Text>
      <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="comma-separated, or None" />

      <Text style={styles.fieldLabel}>Chronic Conditions</Text>
      <TextInput style={styles.input} value={conditions} onChangeText={setConditions} placeholder="comma-separated, or None" />

      <TouchableOpacity style={styles.addButton} onPress={submit} disabled={loading}>
        <Text style={styles.addButtonText}>{loading ? 'Saving...' : isEditing ? 'Save Changes' : '+ Add Member'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main FamilyTab ────────────────────────────────────────────────────────
export default function FamilyTab({ apiBase, token }) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('list'); // 'list' | 'add' | 'history' | 'edit'
  const [selectedMember, setSelectedMember] = useState(null);

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/patient/me/family`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setFamilyMembers(await res.json());
    } catch (e) {
      console.log('Failed to fetch family members', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFamily(); }, []);

  const confirmRemoval = (id, memberName) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMember(id) }
      ]
    );
  };

  const removeMember = async (id) => {
    try {
      await fetch(`${apiBase}/patient/me/family/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadFamily();
    } catch (e) {
      console.log('Failed to remove member', e);
    }
  };

  // Sub-screens
  if (screen === 'add') {
    return (
      <FamilyMemberForm
        apiBase={apiBase}
        token={token}
        onBack={() => setScreen('list')}
        onDone={() => { loadFamily(); setScreen('list'); }}
      />
    );
  }

  if (screen === 'edit' && selectedMember) {
    return (
      <FamilyMemberForm
        apiBase={apiBase}
        token={token}
        existingMember={selectedMember}
        onBack={() => setScreen('list')}
        onDone={() => { loadFamily(); setScreen('list'); }}
      />
    );
  }

  if (screen === 'history' && selectedMember) {
    return (
      <FamilyHistory
        member={selectedMember}
        apiBase={apiBase}
        token={token}
        onBack={() => setScreen('list')}
      />
    );
  }

  // Main list screen
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Members</Text>
        <Text style={styles.subtitle}>Manage connected profiles to trace historical antibiotic usage patterns.</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setScreen('add')}>
        <Text style={styles.addButtonText}>+ Add New Member</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0d7377" style={{ marginTop: 20 }} />
      ) : familyMembers.length === 0 ? (
        <Text style={styles.emptyText}>No linked family members yet.</Text>
      ) : (
        <View style={styles.listContainer}>
          {familyMembers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => { setSelectedMember(item); setScreen('history'); }}
              activeOpacity={0.75}
            >
              <View style={styles.cardContent}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRelation}>
                  {item.relation.toUpperCase()} · {item.id_type}: {item.id_value}
                </Text>
                {item.age ? <Text style={styles.memberMeta}>Age: {item.age}{item.blood_group ? `  ·  Blood: ${item.blood_group}` : ''}</Text> : null}
                {item.allergies ? <Text style={styles.memberAllergy}>⚠️ {item.allergies}</Text> : null}
                <Text style={styles.tapHint}>Tap to view prescriptions →</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => { setSelectedMember(item); setScreen('edit'); }}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => confirmRemoval(item.id, item.name)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f7' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0d7377' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 4 },
  addButton: { backgroundColor: '#0d7377', marginHorizontal: 20, marginVertical: 12, padding: 14, borderRadius: 10, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContainer: { paddingHorizontal: 20 },
  emptyText: { color: '#8a9a9a', fontSize: 15, textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, padding: 16, elevation: 1 },
  cardContent: { marginBottom: 10 },
  memberName: { fontSize: 17, fontWeight: '700', color: '#0d7377' },
  memberRelation: { fontSize: 13, color: '#666', marginTop: 2 },
  memberMeta: { fontSize: 13, color: '#555', marginTop: 4 },
  memberAllergy: { fontSize: 13, color: '#c0392b', marginTop: 4 },
  tapHint: { fontSize: 12, color: '#0d7377', marginTop: 6, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10 },
  editButton: { backgroundColor: '#e8f4f4', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#0d7377' },
  editButtonText: { color: '#0d7377', fontWeight: '600', fontSize: 13 },
  removeButton: { backgroundColor: '#fff3f3', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#f0c0c0' },
  removeButtonText: { color: '#c0392b', fontWeight: '600', fontSize: 13 },

  // Sub-screen shared
  detailContainer: { flex: 1, backgroundColor: '#f0f7f7' },
  backBtn: { marginBottom: 16, marginTop: 8 },
  backBtnText: { color: '#0d7377', fontWeight: '600', fontSize: 15 },
  detailTitle: { fontSize: 22, fontWeight: '700', color: '#0d7377', marginBottom: 20 },

  // History
  dateGroup: { marginBottom: 20 },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  rxCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1 },
  rxDrug: { fontSize: 16, fontWeight: '600', color: '#0d7377' },
  rxMeta: { fontSize: 13, color: '#666', marginTop: 2 },
  rxStatus: { fontSize: 12, color: '#888', marginTop: 4 },

  // Detail
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#cde' },
  rowButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  chip: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#cde' },
  chipSelected: { backgroundColor: '#0d7377', borderColor: '#0d7377' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
});