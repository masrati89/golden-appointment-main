import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Ban, Plus, Trash2, X, Calendar, Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatHebrewDate } from '@/lib/dateHelpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function BlockedSlotsPage() {
  const queryClient = useQueryClient();
  // businessId is sourced from auth context (loaded once at login) — single source of truth.
  const { user, businessId } = useAdminAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '18:00',
    reason: '',
  });

  const { data: blockedSlots } = useQuery({
    queryKey: ['blocked-slots', businessId],
    // Only execute once we have a verified businessId — prevents cross-tenant data fetch
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('business_id', businessId!)
        .gte('blocked_date', format(new Date(), 'yyyy-MM-dd'))
        .order('blocked_date')
        .order('start_time');
      return data ?? [];
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Security guard: business_id must be present before any write operation
      if (!businessId) throw new Error('שגיאה: מזהה עסק חסר');
      if (data.startTime >= data.endTime) throw new Error('שעת סיום חייבת להיות אחרי שעת התחלה');

      // Check for existing bookings in this time range — scoped to own business only
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, customer_name, booking_time')
        .eq('business_id', businessId)
        .eq('booking_date', data.date)
        .in('status', ['confirmed', 'pending'])
        .gte('booking_time', data.startTime)
        .lt('booking_time', data.endTime);

      if (conflicts && conflicts.length > 0) {
        const names = conflicts.map((b) => `${b.customer_name} (${b.booking_time})`).join(', ');
        throw new Error(`קיימים ${conflicts.length} תורים בזמן זה: ${names}`);
      }
      const { error } = await supabase.from('blocked_slots').insert({
        blocked_date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        reason: data.reason || 'חסום על ידי מנהל',
        business_id: businessId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Include businessId in invalidation key — prevents clearing another tenant's cache
      queryClient.invalidateQueries({ queryKey: ['blocked-slots', businessId] });
      setShowModal(false);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '18:00', reason: '' });
      toast.success('הזמן נחסם בהצלחה');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Security guard: scope DELETE to own business_id to prevent cross-tenant deletion
      if (!businessId) throw new Error('שגיאה: מזהה עסק חסר');
      const { error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('id', id)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Include businessId in invalidation key — prevents clearing another tenant's cache
      queryClient.invalidateQueries({ queryKey: ['blocked-slots', businessId] });
      toast.success('החסימה הוסרה');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">חסימת זמנים</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-all text-sm min-h-[48px]"
        >
          <Plus className="w-4 h-4" />
          חסום זמן חדש
        </button>
      </div>

      <div className="glass-card p-6">
        {!blockedSlots?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ban className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p>אין זמנים חסומים</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedSlots.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-xl min-h-[64px]">
                <div>
                  <p className="font-semibold text-foreground">
                    {formatHebrewDate(new Date(block.blocked_date + 'T00:00:00'))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}
                  </p>
                  {block.reason && <p className="text-sm text-destructive mt-1">{block.reason}</p>}
                </div>
                <button
                  onClick={() => { if (confirm('הסר חסימה?')) deleteMutation.mutate(block.id); }}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card shadow-2xl w-full max-w-md" style={{ background: 'hsl(0 0% 100% / 0.95)' }}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                חסימת זמן
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                  <Calendar className="w-4 h-4" /> תאריך
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                    <Clock className="w-4 h-4" /> שעת התחלה
                  </Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                    <Clock className="w-4 h-4" /> שעת סיום
                  </Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                  <FileText className="w-4 h-4" /> סיבה (אופציונלי)
                </Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="חופשה, הפסקה..."
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <strong>שים לב:</strong> חסימת זמן תמנע הזמנות חדשות בטווח זה. תורים קיימים לא יושפעו.
                </p>
              </div>
              <button
                onClick={() => blockMutation.mutate(formData)}
                disabled={blockMutation.isPending}
                className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {blockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                חסום זמן
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
