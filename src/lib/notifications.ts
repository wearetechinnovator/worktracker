// Client-side Browser System Notification Helper

export async function requestNotificationPermission(): Promise<{ granted: boolean; status: NotificationPermission }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, status: 'denied' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true, status: 'granted' };
  }

  try {
    const permission = await new Promise<NotificationPermission>((resolve) => {
      const res = Notification.requestPermission((p) => resolve(p));
      if (res && typeof res.then === 'function') {
        res.then(resolve);
      }
    });
    return { granted: permission === 'granted', status: permission };
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return { granted: false, status: Notification.permission };
  }
}

export function sendNativeNotification(title: string, body: string, url = '/tasks') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });

      notification.onclick = () => {
        window.focus();
        if (url) {
          window.location.href = url;
        }
        notification.close();
      };
    } catch (err) {
      console.error('Error firing native notification:', err);
    }
  }
}
