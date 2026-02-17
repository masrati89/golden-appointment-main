import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Sparkles, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ServiceForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: ServiceForm = {
  name: '',
  description: '',
  price: 0,
  duration_min: 30,
  image_url: '',
  is_active: true,
  sort_order: 0,
};

export default function ServicesManagement() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServiceForm | null>(null);

  const { data: services } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('*').order('sort_order');
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: ServiceForm) => {
      if (form.id) {
        const { error } = await supabase.from('services').update({
          name: form.name,
          description: form.description || null,
          price: form.price,
          duration_min: form.duration_min,
          image_url: form.image_url || null,
          is_active: form.is_active,
          sort_order: form.sort_order,
        }).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert({
          name: form.name,
          description: form.description || null,
          price: form.price,
          duration_min: form.duration_min,
          image_url: form.image_url || null,
          is_active: form.is_active,
          sort_order: form.sort_order,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setEditing(null);
      toast.success('השירות נשמר');
    },
    onError: () => toast.error('שגיאה בשמירה'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('השירות נמחק');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">ניהול שירותים</h1>
        <button
          onClick={() => setEditing({ ...emptyForm })}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all text-sm min-h-[48px]"
        >
          <Plus className="w-4 h-4" />
          הוסף שירות
        </button>
      </div>

      <div className="space-y-3">
        {services?.map((service) => (
          <div key={service.id} className="glass-card p-5 flex items-center justify-between gap-4 min-h-[72px]">
            <div className="flex items-center gap-4">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-foreground">{service.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {service.duration_min} דקות • ₪{Number(service.price)} •{' '}
                  <span className={service.is_active ? 'text-green-600' : 'text-destructive'}>
                    {service.is_active ? 'פעיל' : 'לא פעיל'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setEditing({
                    id: service.id,
                    name: service.name,
                    description: service.description || '',
                    price: Number(service.price),
                    duration_min: service.duration_min,
                    image_url: service.image_url || '',
                    is_active: service.is_active ?? true,
                    sort_order: service.sort_order ?? 0,
                  })
                }
                className="px-4 py-2 border-2 border-primary text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all text-sm min-h-[44px]"
              >
                ערוך
              </button>
              <button
                onClick={() => {
                  if (confirm('בטוח למחוק שירות זה?')) deleteMutation.mutate(service.id);
                }}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(0 0% 100% / 0.95)' }}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">{editing.id ? 'עריכת שירות' : 'שירות חדש'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-secondary rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">שם השירות *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">תיאור</Label>
                <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">מחיר (₪) *</Label>
                  <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="h-12 rounded-xl" />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">משך (דקות) *</Label>
                  <Input type="number" value={editing.duration_min} onChange={(e) => setEditing({ ...editing, duration_min: Number(e.target.value) })} className="h-12 rounded-xl" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">URL תמונה</Label>
                <Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="h-12 rounded-xl" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">סדר מיון</Label>
                <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="h-12 rounded-xl" />
              </div>
              <div className="flex items-center justify-between min-h-[48px]">
                <Label className="text-sm font-semibold">פעיל</Label>
                <Switch checked={editing.is_active} onCheckedChange={(checked) => setEditing({ ...editing, is_active: checked })} />
              </div>
              <button
                onClick={() => saveMutation.mutate(editing)}
                disabled={saveMutation.isPending || !editing.name || !editing.price}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing.id ? 'עדכן שירות' : 'הוסף שירות'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
