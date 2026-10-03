import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'history', label: 'History', icon: '🗂️' },
  { key: 'qr', label: 'QR', icon: '🔳' },
  { key: 'book', label: 'Book', icon: '📅' },
  { key: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  
];

export default function BottomNav({ activeTab, onTabPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={styles.tab}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8eeee',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,   // bigger tap area
    minHeight: 52,
  },
  icon: { fontSize: 18, marginBottom: 3, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 11, color: '#8a9a9a', fontWeight: '600' },
  labelActive: { color: '#0d7377', fontWeight: '700' },
});