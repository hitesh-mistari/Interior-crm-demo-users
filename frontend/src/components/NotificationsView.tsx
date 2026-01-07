import React from 'react';
import { useApp } from '../context/AppContext';

const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  return (
    <div className="notifications-view">
      <h2>Notifications</h2>
      <button onClick={() => markAllNotificationsRead()}>Mark All as Read</button>
      <ul>
        {notifications.map(notification => (
          <li key={notification.id} className={notification.read ? 'read' : 'unread'}>
            <p>{notification.message}</p>
            <span>{new Date(notification.createdAt).toLocaleString()}</span>
            {!notification.read && (
              <button onClick={() => markNotificationRead(notification.id)}>Mark as Read</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsView;
