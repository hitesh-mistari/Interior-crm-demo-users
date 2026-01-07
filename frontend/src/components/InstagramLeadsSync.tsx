import { useState } from 'react';
import { Instagram, RefreshCw, AlertCircle, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSystemSettings } from '../context/SettingsContext';
import { Lead } from '../types';

export default function InstagramLeadsSync() {
  const { addLead, currentUser } = useApp();
  const { getSetting, updateSetting } = useSystemSettings();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const appId = getSetting('instagram_app_id');
  const accessToken = getSetting('instagram_access_token');
  const pageId = getSetting('instagram_page_id');
  const lastSync = getSetting('instagram_last_sync');

  const isConfigured = appId && accessToken && pageId;

  const syncInstagramLeads = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const sampleLeads = [
        {
          name: 'John Doe',
          phone: '+919876543210',
          location: 'Mumbai',
          instagram_lead_id: 'ig_' + Date.now() + '_1',
        },
        {
          name: 'Jane Smith',
          phone: '+919876543211',
          location: 'Delhi',
          instagram_lead_id: 'ig_' + Date.now() + '_2',
        },
      ];

      for (const leadData of sampleLeads) {
        const lead: Lead = {
          id: crypto.randomUUID(),
          name: leadData.name,
          phone: leadData.phone,
          location: leadData.location,
          source: 'Instagram',
          status: 'New',
          lead_type: 'Warm',
          instagram_lead_id: leadData.instagram_lead_id,
          created_at: new Date().toISOString(),
          created_by: currentUser!.id,
          deleted: false,
        };
        addLead(lead);
      }

      await updateSetting('instagram_last_sync', new Date().toISOString());

      setSyncStatus('success');
      setMessage(`Successfully synced ${sampleLeads.length} new leads from Instagram`);
    } catch (error) {
      setSyncStatus('error');
      setMessage('Failed to sync leads. Please check your Instagram connection.');
      console.error('Instagram sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Instagram className="w-6 h-6 text-pink-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Instagram Lead Form Ads Integration
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Automatically fetch leads from your Instagram ad campaigns. Connect your Meta Business
            account to enable automatic lead synchronization.
          </p>

          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <SettingsIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Configuration Required</p>
                <p>
                  Please configure your Instagram API credentials in Settings to enable lead sync.
                </p>
              </div>
            </div>
          )}

          {isConfigured && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Configuration Status:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>App ID:</span>
                  <span className="font-medium text-green-600">Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Access Token:</span>
                  <span className="font-medium text-green-600">Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Page ID:</span>
                  <span className="font-medium text-green-600">Configured</span>
                </div>
                {lastSync && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span>Last Sync:</span>
                    <span className="font-medium">{new Date(lastSync).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {syncStatus === 'success' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{message}</p>
            </div>
          )}

          <button
            onClick={syncInstagramLeads}
            disabled={isSyncing || !isConfigured}
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : isConfigured ? 'Sync Instagram Leads (Demo)' : 'Configure Settings First'}
          </button>

          <p className="text-xs text-slate-500 mt-3">
            {isConfigured
              ? 'Note: This is a demo sync. In production, leads will be automatically fetched from Meta Graph API when new lead forms are submitted.'
              : 'Configure your Instagram API credentials in Settings to enable this feature.'}
          </p>
        </div>
      </div>
    </div>
  );
}
