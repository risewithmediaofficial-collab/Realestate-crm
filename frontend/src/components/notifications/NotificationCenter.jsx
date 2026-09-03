import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2, AlertCircle, Check } from 'lucide-react';
import api from '../../services/api';
import '../../styles/notifications.css';

const NotificationCenter = ({ isOpen, onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications', {
        params: {
          isRead: filter === 'unread' ? false : undefined,
          limit: 20,
        },
      });

      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.data.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications(notifications.map(n => 
          n._id === id ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/all/read');
      if (response.data.success) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      if (response.data.success) {
        const deleted = notifications.find(n => n._id === id);
        setNotifications(notifications.filter(n => n._id !== id));
        if (deleted && !deleted.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ready_for_registration':
      case 'registration_upcoming':
      case 'registration_date_set':
      case 'registration_completed':
        return '🏛️';
      case 'sale_agreement_upcoming':
      case 'agreement_date_set':
      case 'agreement_signed':
        return '📅';
      case 'booking_created':
      case 'booking_approved':
      case 'booking_cancelled':
      case 'booking_status_changed':
        return '📋';
      case 'payment_received':
        return '💰';
      case 'lead_assigned':
      case 'lead_updated':
        return '👤';
      case 'sla_breach':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <>
      {isOpen && (
        <div className="notification-overlay" onClick={onClose} />
      )}
      
      <div className={`notification-center ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="notification-header">
          <div className="notification-title">
            <Bell size={20} />
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <button 
            className="notification-close"
            onClick={onClose}
            title="Close notifications"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="notification-filters">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button
              className="filter-action"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="notification-list">
          {isLoading ? (
            <div className="notification-loading">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={32} />
              <p>
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="notification-header-row">
                    <span className="notification-type-icon">
                      {getTypeIcon(notification.type)}
                    </span>
                    <div className="notification-meta">
                      <div className="notification-title-text">{notification.title}</div>
                      <div className="notification-time">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <span 
                        className="notification-unread-dot"
                        style={{ backgroundColor: getSeverityColor(notification.severity) }}
                      />
                    )}
                  </div>

                  <div className="notification-message">
                    {notification.message}
                  </div>

                  {notification.description && (
                    <div className="notification-description">
                      {notification.description}
                    </div>
                  )}

                  {notification.relatedEntity?.name && (
                    <div className="notification-entity">
                      <strong>{notification.relatedEntity.name}</strong>
                    </div>
                  )}

                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button
                        className="action-btn mark-read-btn"
                        onClick={() => handleMarkAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="action-btn action-link-btn"
                        title={notification.actionLabel}
                      >
                        {notification.actionLabel || 'View'}
                      </a>
                    )}
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(notification._id)}
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;
