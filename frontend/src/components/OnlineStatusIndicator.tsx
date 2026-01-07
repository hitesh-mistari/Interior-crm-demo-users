import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OnlineStatusIndicator() {
  const { isOnline, lastSyncTime, syncStatus, forceSync } = useOnlineStatus();
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track when user comes back online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlineMessage(false);
    } else if (wasOffline && isOnline) {
      // User just came back online
      setShowOnlineMessage(true);
      setWasOffline(false);

      // Hide after 4 seconds
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return lastSyncTime
          ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
          : 'Ready to sync';
    }
  };

  // Don't render anything if online and not showing reconnect message
  if (isOnline && !showOnlineMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all ${isOnline
            ? 'bg-green-500/90 text-white'
            : 'bg-red-500/90 text-white'
          }`}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isOnline ? 'You are online back' : 'Offline'}
          </span>
          {isOnline && (
            <div className="flex items-center gap-2">
              {getSyncIcon()}
              <span className="text-xs opacity-90">{getSyncText()}</span>
              {syncStatus === 'idle' && (
                <button
                  onClick={forceSync}
                  className="text-xs underline opacity-90 hover:opacity-100"
                >
                  Sync now
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="mt-2 p-3 bg-red-500/90 text-white rounded-lg shadow-lg backdrop-blur-sm max-w-xs">
          <p className="text-sm font-semibold mb-1">No Internet Connection</p>
          <p className="text-xs">
            Please connect to the internet to use this application. All features require an active internet connection.
          </p>
        </div>
      )}
    </div>
  );
}
