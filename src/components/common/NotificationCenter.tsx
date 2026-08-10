/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * COMPOSANT DE NOTIFICATIONS RH & PAIE
 * Alerte RH: Contrats à expiration, Visites Médicales en attente, Demandes de Congés à valider.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  FileText,
  Calendar,
  Stethoscope,
  CheckCheck,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  NotificationItem,
  NotificationType,
  getHRNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';

interface NotificationCenterProps {
  onNavigateToModule?: (moduleKey: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateToModule }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CONTRACT' | 'LEAVE' | 'MEDICAL'>('ALL');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getHRNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh periodically every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    markAllNotificationsAsRead(unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    setIsOpen(false);
    if (onNavigateToModule) {
      onNavigateToModule(notif.targetModule);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'CONTRACT') return n.type === 'CONTRACT_EXPIRING';
    if (activeFilter === 'LEAVE') return n.type === 'LEAVE_PENDING';
    if (activeFilter === 'MEDICAL') return n.type === 'MEDICAL_PENDING';
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'CONTRACT_EXPIRING':
        return <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'LEAVE_PENDING':
        return <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'MEDICAL_PENDING':
        return <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return (
          <span className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
            Urgent
          </span>
        );
      case 'medium':
        return (
          <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
            Action requise
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
            Info
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition shadow-xs flex items-center justify-center ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-[#287BFF] text-[#287BFF] dark:text-blue-400'
            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}
        title="Notifications & Alertes RH"
        aria-label="Centre de notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[550px] transition-colors">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#287BFF]" />
              <h2 className="font-extrabold text-sm text-[#071D49] dark:text-blue-300">
                Centre d'Alertes RH & Paie
              </h2>
              {unreadCount > 0 && (
                <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1 text-slate-500 hover:text-[#287BFF] dark:hover:text-blue-300 text-[11px] font-bold flex items-center space-x-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Tout lire</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold p-1 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap ${
                activeFilter === 'ALL'
                  ? 'bg-[#071D49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tous ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('CONTRACT')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap ${
                activeFilter === 'CONTRACT'
                  ? 'bg-[#071D49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Contrats ({notifications.filter((n) => n.type === 'CONTRACT_EXPIRING').length})
            </button>
            <button
              onClick={() => setActiveFilter('LEAVE')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap ${
                activeFilter === 'LEAVE'
                  ? 'bg-[#071D49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Congés ({notifications.filter((n) => n.type === 'LEAVE_PENDING').length})
            </button>
            <button
              onClick={() => setActiveFilter('MEDICAL')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap ${
                activeFilter === 'MEDICAL'
                  ? 'bg-[#071D49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Santé ({notifications.filter((n) => n.type === 'MEDICAL_PENDING').length})
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Chargement des alertes...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-60" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Aucune alerte pour le moment dans cette catégorie.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-xl transition cursor-pointer flex items-start space-x-3 group relative ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 opacity-80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-l-4 border-l-[#287BFF] dark:border-l-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </span>
                      {getSeverityBadge(notif.severity)}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                      <span>Échéance / Date: {notif.date}</span>
                      <span className="text-[#287BFF] dark:text-blue-400 font-bold group-hover:underline flex items-center space-x-0.5">
                        <span>Traiter</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded transition"
                      title="Marquer comme lu"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-600 block"></span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Mise à jour en temps réel selon la réglementation du travail RDC (Code 2026)
          </div>
        </div>
      )}
    </div>
  );
};
