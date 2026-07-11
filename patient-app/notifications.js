import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Push notifications need a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    return tokenData.data;
  } catch (e) {
    console.log('Error getting push token:', e);
    return null;
  }
}
export async function scheduleCourseReminders(drugName, durationDays) {
  const days = parseInt(durationDays, 10) || 5;
  for (let day = 1; day <= days; day++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medication Reminder',
        body: `Day ${day}/${days}: Have you taken your ${drugName} dose today?`,
      },
      trigger: { seconds: day * 86400 }, // fires once per day, demo-scaled down below
    });
  }
}