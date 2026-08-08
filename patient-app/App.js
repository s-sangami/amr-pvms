import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, ActivityIndicator, Linking, KeyboardAvoidingView, Platform,
  RefreshControl, Animated
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { registerForPushNotificationsAsync } from './notifications';
import ProfileCompletion from './ProfileCompletion';
import BottomNav from './BottomNav';
import FamilyTab from './FamilyTab';
import BookTab from './BookTab';
import QrTab from './QrTab';
import PrivacyNotice from './PrivacyNotice';

const API_BASE = 'https://amr-pvms.onrender.com';

function groupByVisit(prescriptions) {
  const groups = {};
  prescriptions.forEach(p => {
    const key = p.visit_id || p.id;
    if (!groups[key]) {
      groups[key] = {
        doctor_name: p.doctor_name,
        hospital_name: p.hospital_name,
        created_at: p.created_at,
        drugs: [],
      };
    }
    groups[key].drugs.push(p);
  });
  return Object.entries(groups).sort(
    (a, b) => new Date(b[1].created_at) - new Date(a[1].created_at)
  );
}

function formatVisitDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Computes the 3-state course tag: Issued -> Active -> Course Finished
function getCourseTag(p) {
  const isDispensed = p.status?.toLowerCase().includes('dispensed');

  if (!isDispensed) {
    return { label: 'Issued', style: 'tagIssued' };
  }

  // Dispensed: figure out if course window has elapsed
  const courseStartStr = p.dispensed_at || p.created_at;
  const courseStart = courseStartStr ? new Date(courseStartStr) : null;
  const durationDays = parseInt(p.duration_days, 10) || 0;

  if (courseStart && durationDays > 0) {
    const courseEnd = new Date(courseStart);
    courseEnd.setDate(courseEnd.getDate() + durationDays);
    if (new Date() > courseEnd) {
      return { label: 'Course Finished', style: 'tagFinished' };
    }
  }

  return { label: 'Active', style: 'tagActive' };
}

function AppInner() {
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('login');
  const [phone, setPhone] = useState('');
  const [abha, setAbha] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showActive, setShowActive] = useState(false);
  const [visitExpanded, setVisitExpanded] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [antibioticOnly, setAntibioticOnly] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [resetOtp, setResetOtp] = useState('');
  const [sentResetOtp, setSentResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [abhaVerified, setAbhaVerified] = useState(false);
  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaSentOtp, setAbhaSentOtp] = useState('');
  const [abhaTxnId, setAbhaTxnId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }, 2500);
    });
  };

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    showToast(`📋 ${label} copied to clipboard!`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (token) {
      await fetchProfile(token);
      await fetchPrescriptions(token);
    }
    setRefreshing(false);
  };

  const badgeStyleFor = (cat) => {
    if (cat === 'Access') return styles.badgeAccess;
    if (cat === 'Watch') return styles.badgeWatch;
    if (cat === 'Reserve') return styles.badgeReserve;
    if (cat === 'Not Recommended') return styles.badgeNotRecommended;
    return null;
  };

  const toggleVisit = (key) => {
    setVisitExpanded(v => ({ ...v, [key]: !v[key] }));
  };

  const sendAbhaOtp = async () => {
    if (!abha) return Alert.alert('Enter your ABHA number first');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/abha/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abha_number: abha }),
      });
      const data = await res.json();
      const testOtp = data.mock_otp || '';
      setAbhaSentOtp(testOtp);
      // txn_id is present in real ABDM mode; harmless/undefined in mock mode
      setAbhaTxnId(data.txn_id || abha);
      Alert.alert('ABHA OTP sent', testOtp ? `Demo OTP Code: ${testOtp}` : (data.message || 'An OTP was sent to your ABHA-linked mobile.'));
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyAbhaOtp = async () => {
    if (!abhaOtp) return Alert.alert('Enter the ABHA OTP');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/abha/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // abha_number field carries either the ABHA number (mock mode)
        // or the txn_id (real ABDM mode) — backend handles both.
        body: JSON.stringify({ abha_number: abhaTxnId, otp: abhaOtp }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setAbhaVerified(true);
        Alert.alert('ABHA Verified', 'Your ABHA identity is confirmed.');
      } else {
        Alert.alert('Verification failed', data.detail || 'Invalid OTP');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const openAbhaWebsite = () => {
    Linking.openURL('https://abha.abdm.gov.in/abha/v3/register').catch(() =>
      Alert.alert('Could not open the ABHA website')
    );
  };

  const signup = async () => {
    if (!abhaVerified) return Alert.alert('Please verify your ABHA first');
    if (!name || !phone || !password) return Alert.alert('Please fill name, phone, and password');
    if (!consentGiven) return Alert.alert('Consent required', 'Please agree to the Privacy Notice to create your account.');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abha_id: abha, name, phone, password, consent_given: true }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Signed up!', `Welcome ${data.name}. Please log in.`);
        setPassword(''); setAbhaVerified(false); setAbhaOtp(''); setAbhaSentOtp('');
        setMode('login');
      } else {
        Alert.alert('Signup failed', data.detail || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!phone || !password) return Alert.alert('Enter phone and password');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        setPassword('');
        await fetchProfile(data.access_token);
      } else {
        Alert.alert('Login failed', data.detail || 'Invalid phone or password');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const sendResetOtp = async () => {
    if (!phone) return Alert.alert('Enter your phone number first');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setSentResetOtp(data.otp_for_testing);
      Alert.alert('OTP sent (demo)', `Your reset OTP is: ${data.otp_for_testing}`);
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!resetOtp || !newPassword) return Alert.alert('Enter the OTP and a new password');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: resetOtp, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Password reset. Please log in.');
        setResetOtp(''); setSentResetOtp(''); setNewPassword(''); setPassword('');
        setMode('login');
      } else {
        Alert.alert('Reset failed', data.detail || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (jwt) => {
    try {
      const res = await fetch(`${API_BASE}/patient/me/prescriptions/detailed`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (res.ok) setPrescriptions(data);
    } catch (e) {
      console.log('Could not fetch prescriptions:', e);
    }
  };

  const registerPush = async (jwt) => {
    const pushToken = await registerForPushNotificationsAsync();
    if (!pushToken) return;
    try {
      await fetch(`${API_BASE}/patient/me/push-token?push_token=${encodeURIComponent(pushToken)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch (e) {
      console.log('Could not save push token:', e);
    }
  };

  const fetchProfile = async (jwt) => {
    try {
      const res = await fetch(`${API_BASE}/patient/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        if (!data.profile_completed) {
          setMode('complete-profile');
        } else {
          setMode('home');
          fetchPrescriptions(jwt);
          registerPush(jwt);
        }
      } else {
        Alert.alert('Could not load profile', data.detail || 'Unknown error');
      }
    } catch (e) {
      Alert.alert('Network error', String(e));
    }
  };

  const logout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to end your current AMR-PVMS secure patient tracking session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            setToken(''); setProfile(null); setPrescriptions([]);
            setPassword(''); setActiveTab('home');
            setShowActive(false); setAntibioticOnly(false); setVisitExpanded({}); setMode('login');
          }
        }
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all prescription history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `Deleting account for ${profile?.name}. All data will be lost forever.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      const res = await fetch(`${API_BASE}/patient/me`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        setToken(''); setProfile(null); setPrescriptions([]);
                        setPassword(''); setActiveTab('home');
                        setShowActive(false); setMode('login');
                        Alert.alert('Account deleted', 'Your account has been permanently removed.');
                      } else {
                        const data = await res.json();
                        Alert.alert('Error', data.detail || 'Could not delete account.');
                      }
                    } catch (e) {
                      Alert.alert('Network error', String(e));
                    } finally {
                      setLoading(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  if (showPrivacyNotice) {
    return <PrivacyNotice onBack={() => setShowPrivacyNotice(false)} />;
  }

  if (mode === 'complete-profile') {
    return (
      <ProfileCompletion
        apiBase={API_BASE}
        token={token}
        existingProfile={profile?.profile_completed ? profile : null}
        onDone={(data) => { setProfile(data); setMode('home'); fetchPrescriptions(token); registerPush(token); }}
      />
    );
  }

  if (mode === 'home' && profile) {

    const filteredPrescriptions = prescriptions.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.drug_name?.toLowerCase().includes(q) ||
        p.doctor_name?.toLowerCase().includes(q) ||
        p.hospital_name?.toLowerCase().includes(q);
      const matchesAntibiotic = !antibioticOnly || p.is_antibiotic;
      return matchesSearch && matchesAntibiotic;
    });

    const activePrescriptions = prescriptions.filter(
      p => !p.status?.toLowerCase().includes('dispensed')
    );

    const conflictingRx = activePrescriptions.filter(p => p.allergy_conflict);

    const activeVisits = groupByVisit(activePrescriptions);
    const historyVisits = groupByVisit(filteredPrescriptions);

    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0d7377']} tintColor="#0d7377" />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>AMR-PVMS Patient</Text>
            <TouchableOpacity onPress={() => setActiveTab('settings')} style={styles.settingsIcon}>
              <Text style={styles.settingsIconText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'home' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>ABHA ID</Text>
                <TouchableOpacity onPress={() => copyToClipboard(profile.abha_id, 'ABHA ID')} activeOpacity={0.6}>
                  <Text style={[styles.cardValue, { color: '#0d7377' }]}>{profile.abha_id} 📋</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <Text style={styles.cardLabel}>Name</Text>
                <Text style={styles.cardValue}>{profile.name}</Text>
                <View style={styles.divider} />
                <Text style={styles.cardLabel}>Phone</Text>
                <Text style={styles.cardValue}>{profile.phone}</Text>
                {profile.allergies ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.cardLabel}>Allergies</Text>
                    <Text style={styles.cardValueWarn}>{profile.allergies}</Text>
                  </>
                ) : null}
              </View>

              {profile.allergies && profile.allergies.toLowerCase() !== 'none' ? (
                <View style={styles.allergyBanner}>
                  <Text style={styles.allergyBannerText}>
                    ⚠️ Allergy on record: {profile.allergies}. Doctors are alerted before prescribing.
                  </Text>
                </View>
              ) : null}

              {conflictingRx.length > 0 ? (
                <View style={styles.conflictBanner}>
                  <Text style={styles.conflictBannerTitle}>🚨 Allergy Conflict Detected</Text>
                  <Text style={styles.conflictBannerText}>
                    {conflictingRx.length === 1
                      ? `${conflictingRx[0].drug_name} conflicts with your recorded allergies.`
                      : `${conflictingRx.length} active prescriptions conflict with your recorded allergies.`}
                    {' '}Please contact your doctor or pharmacist before taking this medication.
                  </Text>
                </View>
              ) : null}

              {activePrescriptions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No active prescriptions</Text>
                  <Text style={styles.emptyText}>
                    You have no pending prescriptions. Past items are in your History tab. Pull down to refresh.
                  </Text>
                </View>
              ) : (
                <React.Fragment>
                  <TouchableOpacity
                    style={styles.activePrescriptionsButton}
                    onPress={() => setShowActive(v => !v)}
                  >
                    <Text style={styles.activePrescriptionsButtonText}>
                      {showActive ? '▲  Hide Active Prescriptions' : `📋  Show Active Prescriptions (${activePrescriptions.length})`}
                    </Text>
                  </TouchableOpacity>

                  {showActive && (
                    <View style={{ marginTop: 8 }}>
                      {activeVisits.map(([visitKey, visit]) => (
                        <View key={visitKey} style={styles.visitCard}>
                          <TouchableOpacity onPress={() => toggleVisit(visitKey)} activeOpacity={0.75}>
                            <Text style={styles.visitDoctor}>{visit.doctor_name || 'Unknown Doctor'}</Text>
                            <Text style={styles.visitHospital}>{visit.hospital_name || 'Unknown Hospital'}</Text>
                            <Text style={styles.visitDate}>{formatVisitDate(visit.created_at)}</Text>
                          </TouchableOpacity>
                          {visitExpanded[visitKey] && (
                            <View style={styles.visitDrugList}>
                              {visit.drugs.map(p => {
                                const tag = getCourseTag(p);
                                return (
                                  <View key={p.id} style={styles.visitDrugRow}>
                                    <View style={{ flex: 1 }}>
                                      <View style={styles.rxHeaderRow}>
                                        <Text style={styles.visitDrugName}>{p.drug_name}</Text>
                                        {p.aware_category ? (
                                          <View style={[styles.badge, badgeStyleFor(p.aware_category)]}>
                                            <Text style={styles.badgeText}>{p.aware_category}</Text>
                                          </View>
                                        ) : null}
                                      </View>
                                      <Text style={styles.rxDetail}>{p.dosage} · {p.duration_days} days</Text>
                                      <View style={[styles.courseTag, styles[tag.style]]}>
                                        <Text style={styles.courseTagText}>{tag.label}</Text>
                                      </View>
                                      {p.not_recommended ? (
                                        <Text style={styles.conflictText}>⛔ WHO: Not Recommended combination</Text>
                                      ) : null}
                                      {p.allergy_conflict ? (
                                        <Text style={styles.conflictText}>⚠️ Conflicts with your allergies</Text>
                                      ) : null}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </React.Fragment>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>Prescription History</Text>

              <TextInput
                style={[styles.input, { marginBottom: 12, backgroundColor: '#e8f0f0', borderColor: 'transparent' }]}
                placeholder="🔍 Search by drug, doctor, or clinic..."
                placeholderTextColor="#7a8a8a"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />

              <TouchableOpacity
                style={[styles.filterToggle, antibioticOnly && styles.filterToggleActive]}
                onPress={() => setAntibioticOnly(v => !v)}
              >
                <Text style={[styles.filterToggleText, antibioticOnly && styles.filterToggleTextActive]}>
                  {antibioticOnly ? '✓ Showing Antibiotics Only' : '💊 Show Antibiotics Only'}
                </Text>
              </TouchableOpacity>

              {filteredPrescriptions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🗂️</Text>
                  <Text style={styles.emptyTitle}>No history found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery || antibioticOnly ? 'No prescriptions match your filters.' : 'Your past prescriptions will appear here.'}
                  </Text>
                </View>
              ) : (
                historyVisits.map(([visitKey, visit]) => (
                  <View key={visitKey} style={styles.visitCard}>
                    <TouchableOpacity onPress={() => toggleVisit(visitKey)} activeOpacity={0.75}>
                      <Text style={styles.visitDoctor}>{visit.doctor_name || 'Unknown Doctor'}</Text>
                      <Text style={styles.visitHospital}>{visit.hospital_name || 'Unknown Hospital'}</Text>
                      <Text style={styles.visitDate}>{formatVisitDate(visit.created_at)}</Text>
                    </TouchableOpacity>
                    {visitExpanded[visitKey] && (
                      <View style={styles.visitDrugList}>
                        {visit.drugs.map(p => {
                          const tag = getCourseTag(p);
                          return (
                            <View key={p.id} style={styles.visitDrugRow}>
                              <View style={{ flex: 1 }}>
                                <View style={styles.rxHeaderRow}>
                                  <Text style={styles.visitDrugName}>{p.drug_name}</Text>
                                  {p.aware_category ? (
                                    <View style={[styles.badge, badgeStyleFor(p.aware_category)]}>
                                      <Text style={styles.badgeText}>{p.aware_category}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={styles.rxDetail}>{p.dosage} · {p.duration_days} days</Text>
                                <View style={[styles.courseTag, styles[tag.style]]}>
                                  <Text style={styles.courseTagText}>{tag.label}</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'qr' && <QrTab patientData={profile} onRefreshData={handleRefresh} isLoading={refreshing} />}
          {activeTab === 'book' && <BookTab />}
          {activeTab === 'family' && <FamilyTab apiBase={API_BASE} token={token} />}

          {activeTab === 'settings' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.settingsPageTitle}>Settings</Text>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Logged in as</Text>
                <Text style={styles.cardValue}>{profile.name}</Text>
                <Text style={styles.rxDetail}>{profile.phone} · ABHA {profile.abha_id}</Text>
              </View>

              <TouchableOpacity style={styles.settingsItem} onPress={() => setMode('complete-profile')}>
                <Text style={styles.settingsItemText}>✏️  Edit Personal Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem} onPress={handleRefresh}>
                <Text style={styles.settingsItemText}>🔄  Sync Prescriptions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem} onPress={() => setShowPrivacyNotice(true)}>
                <Text style={styles.settingsItemText}>🔒  Privacy Notice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => Alert.alert('AMR-PVMS Patient', 'Version 1.0 (demo)')}
              >
                <Text style={styles.settingsItemText}>ℹ️  About This App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.buttonText}>Log Out</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
                <Text style={styles.deleteButtonText}>🗑️  Delete Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <BottomNav activeTab={activeTab} onTabPress={setActiveTab} />

        <Animated.View style={[styles.toast, { opacity: fadeAnim }]} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      </View>
    );
  }

  if (mode === 'forgot') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>AMR-PVMS Patient</Text>
          <Text style={styles.subtitle}>Reset your password</Text>

          <TextInput style={styles.input} placeholder="Phone number"
            value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.buttonAlt} onPress={sendResetOtp} disabled={loading}>
            <Text style={styles.buttonText}>Send OTP</Text>
          </TouchableOpacity>
          {sentResetOtp ? <Text style={styles.hint}>Demo OTP: {sentResetOtp}</Text> : null}

          <TextInput style={styles.input} placeholder="Enter OTP"
            value={resetOtp} onChangeText={setResetOtp} keyboardType="number-pad" />
          <TextInput style={styles.input} placeholder="New password"
            value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={loading}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={{ marginTop: 16 }} color="#0d7377" />}

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.switch}>Back to Log in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>AMR-PVMS Patient</Text>
        <Text style={styles.subtitle}>
          {mode === 'signup' ? 'Create your account' : 'Log in'}
        </Text>

        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            🔬 Demo Mode — ABDM sandbox approval pending. ABHA verification uses a mock OTP for this prototype.
          </Text>
        </View>

        <TextInput style={styles.input} placeholder="Phone number"
          value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        {mode === 'signup' && (
          <>
            <TextInput style={styles.input} placeholder="ABHA Number"
              value={abha} onChangeText={setAbha} editable={!abhaVerified} />
            {!abhaVerified ? (
              <>
                <TouchableOpacity style={styles.buttonAlt} onPress={sendAbhaOtp} disabled={loading}>
                  <Text style={styles.buttonText}>Verify ABHA (Send OTP)</Text>
                </TouchableOpacity>
                {abhaSentOtp ? <Text style={styles.hint}>Demo ABHA OTP: {abhaSentOtp}</Text> : null}
                <TextInput style={styles.input} placeholder="Enter ABHA OTP"
                  value={abhaOtp} onChangeText={setAbhaOtp} keyboardType="number-pad" />
                <TouchableOpacity style={styles.button} onPress={verifyAbhaOtp} disabled={loading}>
                  <Text style={styles.buttonText}>Confirm ABHA OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openAbhaWebsite}>
                  <Text style={styles.forgotText}>Don't have an ABHA? Create one →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.verifiedText}>✓ ABHA Verified</Text>
                <TextInput style={styles.input} placeholder="Full name"
                  value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Set a password"
                  value={password} onChangeText={setPassword} secureTextEntry />

                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsentGiven(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
                    {consentGiven && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.consentText}>
                    I agree to MedTrace storing and using my health data as described in the{' '}
                    <Text style={styles.consentLink} onPress={() => setShowPrivacyNotice(true)}>
                      Privacy Notice
                    </Text>.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={signup} disabled={loading}>
                  <Text style={styles.buttonText}>Complete Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {mode === 'login' && (
          <>
            <TextInput style={styles.input} placeholder="Password"
              value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={login} disabled={loading}>
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('forgot')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </>
        )}

        {loading && <ActivityIndicator style={{ marginTop: 16 }} color="#0d7377" />}

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          <Text style={styles.switch}>
            {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Sign up'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f7f7' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0d7377', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settingsIcon: { padding: 8 },
  settingsIconText: { fontSize: 20 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#cde' },
  button: { backgroundColor: '#0d7377', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4 },
  buttonAlt: { backgroundColor: '#14a1a6', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 12 },
  logoutButton: { backgroundColor: '#8a4b4b', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switch: { color: '#0d7377', textAlign: 'center', marginTop: 20 },
  forgotText: { color: '#14a1a6', textAlign: 'center', marginTop: 14, fontWeight: '600' },
  verifiedText: { color: '#2e9e5b', fontWeight: '700', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  hint: { color: '#c00', textAlign: 'center', marginBottom: 8, fontWeight: '600' },

  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#0d7377', marginRight: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0d7377' },
  checkboxTick: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  consentText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 19 },
  consentLink: { color: '#0d7377', fontWeight: '700', textDecorationLine: 'underline' },

  demoBanner: { backgroundColor: '#eef6f6', borderRadius: 10, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: '#c4dede' },
  demoBannerText: { color: '#0d7377', fontSize: 12, textAlign: 'center', fontWeight: '600', lineHeight: 17 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8, elevation: 2 },
  cardLabel: { fontSize: 11, color: '#8a9a9a', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 16, color: '#222', fontWeight: '600', marginTop: 2, marginBottom: 4 },
  cardValueWarn: { fontSize: 16, color: '#c0392b', fontWeight: '700', marginTop: 2, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#eef2f2', marginVertical: 10 },

  allergyBanner: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0c0c0' },
  allergyBannerText: { color: '#c0392b', fontSize: 13, fontWeight: '600' },

  conflictBanner: { backgroundColor: '#7d1128', borderRadius: 12, padding: 16, marginTop: 12 },
  conflictBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  conflictBannerText: { color: '#ffe0e0', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  emptyBox: { alignItems: 'center', padding: 30, marginTop: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5a6a6a', marginBottom: 10, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsPageTitle: { fontSize: 26, fontWeight: '700', color: '#0d7377', marginBottom: 16, marginTop: 4 },

  activePrescriptionsButton: { backgroundColor: '#0d7377', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  activePrescriptionsButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  filterToggle: { backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#cde' },
  filterToggleActive: { backgroundColor: '#0d7377', borderColor: '#0d7377' },
  filterToggleText: { color: '#0d7377', fontWeight: '700', fontSize: 13 },
  filterToggleTextActive: { color: '#fff' },

  visitCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1 },
  visitDoctor: { fontSize: 16, fontWeight: '700', color: '#0d7377' },
  visitHospital: { fontSize: 13, color: '#666', marginTop: 2 },
  visitDate: { fontSize: 12, color: '#8a9a9a', marginTop: 4 },
  visitDrugList: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f2', paddingTop: 10 },
  visitDrugRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f8f8' },
  visitDrugName: { fontSize: 14, fontWeight: '600', color: '#0d7377', flexShrink: 1, marginRight: 8 },

  rxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  conflictText: { color: '#c0392b', fontSize: 12, fontWeight: '700', marginTop: 8 },

  // Course status tags
  courseTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  courseTagText: { fontSize: 11, fontWeight: '700' },
  tagIssued: { backgroundColor: '#eef2f2' },
  tagActive: { backgroundColor: '#e3f5ea' },
  tagFinished: { backgroundColor: '#eef0f5' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  badgeAccess: { backgroundColor: '#2e9e5b' },
  badgeWatch: { backgroundColor: '#e08e0b' },
  badgeReserve: { backgroundColor: '#c0392b' },
  badgeNotRecommended: { backgroundColor: '#7d1128' },

  settingsItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 10 },
  settingsItemText: { fontSize: 15, color: '#333', fontWeight: '600' },

  deleteButton: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#f0c0c0' },
  deleteButtonText: { color: '#c0392b', fontWeight: '700', fontSize: 15 },

  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, zIndex: 999, elevation: 5 },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});