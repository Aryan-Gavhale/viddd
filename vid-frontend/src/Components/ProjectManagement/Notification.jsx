import React, { useState, useEffect } from "react";

const NotificationsAlerts = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Simulating incoming notifications
    const timer = setInterval(() => {
      const newNotification = {
        id: Date.now(),
        message: `New notification at ${new Date().toLocaleTimeString()}`,
        type: ["info", "warning", "success"][Math.floor(Math.random() * 3)],
      };
      setNotifications((prev) => [...prev, newNotification]);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const removeNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <div className="notifications-alerts">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <p>{notification.message}</p>
          <button onClick={() => removeNotification(notification.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
};

export default NotificationsAlerts;
