import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-2xl p-4 max-w-md">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Update Available</h3>
            <p className="text-sm text-green-100">
              A new version of the app is ready.
            </p>
          </div>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-white text-green-600 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
          >
            Update
          </button>
          <button
            onClick={close}
            className="ml-2 px-4 py-2 bg-black/20 text-white rounded-md text-sm font-medium hover:bg-black/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
