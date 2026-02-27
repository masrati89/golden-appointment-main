import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ArrowLeft, LogOut, User } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { businessHomeUrl } from '@/lib/businessSlug';

interface BookingWithService {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string | null;
  total_price: number;
  customer_name: string;
  services: { name: string } | null;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const { user, logout } = useClientAuth();
  const { data: bookings = [], isLoading: loading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, booking_time, status, total_price, customer_name, services:service_id(name)')
        .eq('client_id', user!.id)
        .order('booking_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as BookingWithService[];
    },
  });

  const handleLogout = async () => {
    // logout() calls signOut + redirects via window.location.href to the business page
    await logout();
    navigate(businessHomeUrl());
  };

  const today = startOfDay(new Date());

  const { upcoming, history } = useMemo(() => {
    const up: BookingWithService[] = [];
    const hist: BookingWithService[] = [];
    bookings.forEach((b) => {
      const bDate = new Date(b.booking_date);
      if (
        (isAfter(bDate, today) || format(bDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) &&
        b.status !== 'cancelled'
      ) {
        up.push(b);
      } else {
        hist.push(b);
      }
    });
    up.sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime());
    return { upcoming: up, history: hist };
  }, [bookings, today]);

  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">מאושר</Badge>;
      case 'pending':
        return <Badge className="bg-primary/20 text-primary border-primary/30">ממתין</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">בוטל</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-muted-foreground border-muted">הושלם</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const BookingCard = ({ booking, faded }: { booking: BookingWithService; faded?: boolean }) => (
    <div className={`glass-card p-4 flex justify-between items-center gap-3 ${faded ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm truncate">
          {booking.services?.name || 'טיפול'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(booking.booking_date), 'dd/MM/yyyy')} · {booking.booking_time?.slice(0, 5)}
        </p>
        <p className="text-xs text-primary font-semibold mt-0.5">₪{booking.total_price}</p>
      </div>
      <div>{statusBadge(booking.status)}</div>
    </div>
  );

  return (
    <Layout>
      <div className="py-4 space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'שלום'}
              </h2>
              <p className="text-xs text-muted-foreground">התורים שלך</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            יציאה
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-4">
            <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-foreground font-semibold">עדיין אין לך תורים</p>
            <Button onClick={() => navigate('/booking-menu')}>
              <ArrowLeft className="w-4 h-4" />
              הזמינו תור עכשיו
            </Button>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-primary">תורים קרובים</h3>
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </section>
            )}

            {/* History */}
            {history.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-muted-foreground">היסטוריה</h3>
                {history.map((b) => (
                  <BookingCard key={b.id} booking={b} faded />
                ))}
              </section>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate('/booking-menu')}>
              הזמינו תור חדש
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
};

export default MyBookings;
