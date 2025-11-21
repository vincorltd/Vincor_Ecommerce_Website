interface NotificationState {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const notificationState = reactive<NotificationState>({
  show: false,
  title: '',
  message: '',
  type: 'info',
});

export const useNotification = () => {
  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string
  ) => {
    notificationState.message = message;
    notificationState.type = type;
    notificationState.title = title || '';
    notificationState.show = true;
  };

  const hideNotification = () => {
    notificationState.show = false;
  };

  // Convenience methods
  const success = (message: string, title?: string) => {
    showNotification(message, 'success', title);
  };

  const error = (message: string, title?: string) => {
    showNotification(message, 'error', title);
  };

  const warning = (message: string, title?: string) => {
    showNotification(message, 'warning', title);
  };

  const info = (message: string, title?: string) => {
    showNotification(message, 'info', title);
  };

  return {
    notificationState: readonly(notificationState),
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info,
  };
};













