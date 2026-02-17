import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Database } from 'lucide-react';

export function StorageDebug() {
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<{ url: string; key: string } | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setBuckets(null);
    setError(null);
    
    try {
      // Log client configuration (without exposing full key)
      const url = import.meta.env.VITE_SUPABASE_URL || 'N/A';
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY 
        ? `${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.substring(0, 20)}...` 
        : 'N/A';
      setClientInfo({ url, key });

      // Test listing buckets
      const { data, error: listError } = await supabase.storage.listBuckets();
      
      console.log('=== Storage Connection Test ===');
      console.log('Supabase URL:', url);
      console.log('All Buckets:', data);
      console.log('Error:', listError);
      console.log('==============================');

      if (listError) {
        setError(listError.message || JSON.stringify(listError));
        toast.error(`Storage Error: ${listError.message}`);
      } else {
        setBuckets(data || []);
        if (data && data.length > 0) {
          toast.success(`Found ${data.length} bucket(s)`);
        } else {
          toast.warning('No buckets found');
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || JSON.stringify(err);
      setError(errorMessage);
      console.error('Storage test failed:', err);
      toast.error(`Test Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-4 space-y-3 border-2 border-destructive/20">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-destructive" />
        <h3 className="font-bold text-foreground">Storage Connection Debug</h3>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Test if the Supabase client can access storage buckets. This helps diagnose "Bucket not found" errors.
      </p>

      {clientInfo && (
        <div className="text-xs space-y-1 p-2 bg-secondary/50 rounded-lg">
          <div><strong>Supabase URL:</strong> {clientInfo.url}</div>
          <div><strong>API Key:</strong> {clientInfo.key}</div>
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={loading}
        className="w-full h-10 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-destructive/30"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Database className="w-4 h-4" />
            Test Storage Connection
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-destructive text-sm mb-1">Error:</div>
              <div className="text-xs text-destructive/90 font-mono break-all">{error}</div>
            </div>
          </div>
        </div>
      )}

      {buckets && buckets.length > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-green-700 dark:text-green-300 text-sm mb-2">
                Available Buckets ({buckets.length}):
              </div>
              <ul className="space-y-1">
                {buckets.map((bucket) => (
                  <li
                    key={bucket.id}
                    className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                  >
                    <strong>ID:</strong> {bucket.id} | <strong>Name:</strong> {bucket.name} | <strong>Public:</strong>{' '}
                    {bucket.public ? 'Yes' : 'No'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {buckets && buckets.length === 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-yellow-700 dark:text-yellow-300 text-sm mb-1">No Buckets Found</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                The connection succeeded but no buckets are available. Check your Supabase project settings.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
