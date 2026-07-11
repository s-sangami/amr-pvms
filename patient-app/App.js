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
import PrescriptionDetail from './PrescriptionDetail';
import FamilyTab from './FamilyTab';
import BookTab from './BookTab';
import QrTab from './QrTab';

const API_BASE = 'https://amr-pvms.onrender.com';

// ─── Helper: group prescriptions by date ───────────────────────────────────
function groupByDate(prescriptions) {
  const groups = {};
  prescriptions.forEach(p => {
    const label = p.created_at
      ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Unknown date';
    if (!groups[label]) groups[label] = [];
    groups[label].push(p);
  });
  return groups;
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
  const [selectedRx, setSelectedRx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Home tab
  const [showActive, setShowActive] = useState(false);

  // History tab
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Forgot password
  const [resetOtp, setResetOtp] = useState('');
  const [sentResetOtp, setSentResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // ABHA verification
  const [abhaVerified, setAbhaVerified] = useState(false);
  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaSentOtp, setAbhaSentOtp] = useState('');

  // ---------- UI HELPERS ----------
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

  // ---------- ABHA ----------
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
      Alert.alert('ABHA OTP sent', testOtp ? `Demo OTP Code: ${testOtp}` : 'An OTP was sent to your ABHA-linked mobile.');
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
        body: JSON.stringify({ abha_number: abha, otp: abhaOtp }),
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

  // ---------- AUTH ----------
  const signup = async () => {
    if (!abhaVerified) return Alert.alert('Please verify your ABHA first');
    if (!name || !phone || !password) return Alert.alert('Please fill name, phone, and password');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abha_id: abha, name, phone, password }),
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

  // ---------- DATA ----------
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
            setPassword(''); setActiveTab('home'); setSelectedRx(null);
            setShowActive(false); setMode('login');
          }
        }
      ]
    );
  };

  // #7b — Delete Account
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
            // Second confirmation
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
                        setPassword(''); setActiveTab('home'); setSelectedRx(null);
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

  // ---------- PROFILE COMPLETION ----------
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

  // ---------- PRESCRIPTION DETAIL ----------
  if (selectedRx) {
    return <PrescriptionDetail prescription={selectedRx} onClose={() => setSelectedRx(null)} />;
  }

  // ---------- HOME ----------
  if (mode === 'home' && profile) {

    // ── History: filter + group ──
    const filteredPrescriptions = prescriptions.filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        p.drug_name?.toLowerCase().includes(q) ||
        p.doctor_name?.toLowerCase().includes(q) ||
        p.hospital_name?.toLowerCase().includes(q)
      );
    });
    const historyGroups = groupByDate(filteredPrescriptions);

    // ── Home: active prescriptions grouped ──
    const activePrescriptions = prescriptions.filter(
      p => !p.status?.toLowerCase().includes('dispensed')
    );
    const activeGroups = groupByDate(activePrescriptions);

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

          {/* ══════════ HOME TAB ══════════ */}
          {activeTab === 'home' && (
            <>
              {/* Patient card */}
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

              {/* Allergy banner */}
              {profile.allergies && profile.allergies.toLowerCase() !== 'none' ? (
                <View style={styles.allergyBanner}>
                  <Text style={styles.allergyBannerText}>
                    ⚠️ Allergy on record: {profile.allergies}. Doctors are alerted before prescribing.
                  </Text>
                </View>
              ) : null}

              {/* #5 — Active prescriptions button */}
              {activePrescriptions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No active prescriptions</Text>
                  <Text style={styles.emptyText}>
                    You have no pending prescriptions. Past items are in your History tab. Pull down to refresh.
                  </Text>
                </View>
              ) : (
                <>
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
                      {Object.entries(activeGroups).map(([date, rxList]) => (
                        <View key={date} style={styles.dateGroup}>
                          <Text style={styles.dateLabel}>{date}</Text>
                          {rxList.map(p => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.rxCard}
                              onPress={() => setSelectedRx(p)}
                              activeOpacity={0.75}
                            >
                              <View style={styles.rxHeaderRow}>
                                <Text style={styles.rxDrug}>{p.drug_name}</Text>
                                {p.aware_category ? (
                                  <View style={[styles.badge, badgeStyleFor(p.aware_category)]}>
                                    <Text style={styles.badgeText}>{p.aware_category}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.rxDetail}>{p.dosage} · {p.duration_days} days</Text>
                              <Text style={styles.rxStatus}>{p.status}</Text>
                              {p.not_recommended ? (
                                <Text style={styles.conflictText}>⛔ WHO: Not Recommended combination</Text>
                              ) : null}
                              {p.allergy_conflict ? (
                                <Text style={styles.conflictText}>⚠️ Conflicts with your allergies</Text>
                              ) : null}
                              <Text style={styles.tapHint}>Tap for details →</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* ══════════ HISTORY TAB ══════════ */}
          {activeTab === 'history' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>Prescription History</Text>

              <TextInput
                style={[styles.input, { marginBottom: 16, backgroundColor: '#e8f0f0', borderColor: 'transparent' }]}
                placeholder="🔍 Search by drug, doctor, or clinic..."
                placeholderTextColor="#7a8a8a"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />

              {filteredPrescriptions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🗂️</Text>
                  <Text style={styles.emptyTitle}>No history found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No prescriptions match your search.' : 'Your past prescriptions will appear here.'}
                  </Text>
                </View>
              ) : (
                // #4 — date-grouped history
                Object.entries(historyGroups).map(([date, rxList]) => (
                  <View key={date} style={styles.dateGroup}>
                    <Text style={styles.dateLabel}>{date}</Text>
                    {rxList.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.historyCard}
                        onPress={() => setSelectedRx(p)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.rxHeaderRow}>
                          <Text style={styles.historyDrug}>{p.drug_name}</Text>
                          {p.aware_category ? (
                            <View style={[styles.badge, badgeStyleFor(p.aware_category)]}>
                              <Text style={styles.badgeText}>{p.aware_category}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.historyDose}>{p.dosage} · {p.duration_days} days</Text>
                        <Text style={styles.rxStatus}>{p.doctor_name || '—'} · {p.hospital_name || '—'}</Text>
                        <Text style={styles.tapHint}>Tap to view details →</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ══════════ OTHER TABS ══════════ */}
          {activeTab === 'qr' && <QrTab patientData={profile} onRefreshData={handleRefresh} isLoading={refreshing} />}
          {activeTab === 'book' && <BookTab />}
          {activeTab === 'family' && <FamilyTab apiBase={API_BASE} token={token} />}

          {/* ══════════ SETTINGS TAB ══════════ */}
          {activeTab === 'settings' && (
            <View style={{ marginTop: 8 }}>
              {/* #7a — large Settings header */}
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
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => Alert.alert('AMR-PVMS Patient', 'Version 1.0 (demo)')}
              >
                <Text style={styles.settingsItemText}>ℹ️  About This App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.buttonText}>Log Out</Text>
              </TouchableOpacity>

              {/* #7b — Delete Account */}
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

  // ---------- FORGOT PASSWORD ----------
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

  // ---------- SIGNUP / LOGIN ----------
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>AMR-PVMS Patient</Text>
        <Text style={styles.subtitle}>
          {mode === 'signup' ? 'Create your account' : 'Log in'}
        </Text>

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
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 22 },
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

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8, elevation: 2 },
  cardLabel: { fontSize: 11, color: '#8a9a9a', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 16, color: '#222', fontWeight: '600', marginTop: 2, marginBottom: 4 },
  cardValueWarn: { fontSize: 16, color: '#c0392b', fontWeight: '700', marginTop: 2, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#eef2f2', marginVertical: 10 },

  allergyBanner: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0c0c0' },
  allergyBannerText: { color: '#c0392b', fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', padding: 30, marginTop: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5a6a6a', marginBottom: 10, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // #7a — Settings page title
  settingsPageTitle: { fontSize: 26, fontWeight: '700', color: '#0d7377', marginBottom: 16, marginTop: 4 },

  // #5 — Active prescriptions button
  activePrescriptionsButton: { backgroundColor: '#0d7377', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  activePrescriptionsButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Date grouping (shared between home + history)
  dateGroup: { marginBottom: 20 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#8a9a9a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tapHint: { fontSize: 11, color: '#0d7377', marginTop: 6, fontStyle: 'italic' },

  rxCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, elevation: 1 },
  rxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxDrug: { fontSize: 16, fontWeight: '700', color: '#0d7377', flexShrink: 1, marginRight: 8 },
  rxDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  rxStatus: { fontSize: 12, color: '#8a9a9a', marginTop: 4, textTransform: 'capitalize' },
  conflictText: { color: '#c0392b', fontSize: 12, fontWeight: '700', marginTop: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  badgeAccess: { backgroundColor: '#2e9e5b' },
  badgeWatch: { backgroundColor: '#e08e0b' },
  badgeReserve: { backgroundColor: '#c0392b' },
  badgeNotRecommended: { backgroundColor: '#7d1128' },

  historyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, elevation: 1 },
  historyDrug: { fontSize: 16, fontWeight: '700', color: '#0d7377', flexShrink: 1, marginRight: 8 },
  historyDose: { fontSize: 13, color: '#666', marginTop: 4 },

  settingsItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 10 },
  settingsItemText: { fontSize: 15, color: '#333', fontWeight: '600' },

  // #7b — Delete account button
  deleteButton: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#f0c0c0' },
  deleteButtonText: { color: '#c0392b', fontWeight: '700', fontSize: 15 },

  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, zIndex: 999, elevation: 5 },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});