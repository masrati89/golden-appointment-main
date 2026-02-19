import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Phone, Search, ArrowLeft, LogOut } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('my_bookings_phone');
    if (stored) {
      setSavedPhone(stored);
      fetchBookings(stored);
    }
  }, []);

  const fetchBookings = async (phoneNum: string) => {
    setLoading(true);
    setSearched(true);
    const cleanPhone = phoneNum.replace(/-/g, '');
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time, status, total_price, customer_name, services:service_id(name)')
      .eq('customer_phone', cleanPhone)
      .order('booking_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setBookings(data as BookingWithService[]);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (!phone || phone.length < 10) return;
    const cleanPhone = phone.replace(/-/g, '');
    localStorage.setItem('my_bookings_phone', cleanPhone);
    setSavedPhone(cleanPhone);
    fetchBookings(cleanPhone);
  };

  const handleLogout = () => {
    localStorage.removeItem('my_bookings_phone');
    setSavedPhone(null);
    setBookings([]);
    setSearched(false);
    setPhone('');
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

  // State A: Phone input
  if (!savedPhone) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="glass-card p-8 max-w-sm w-full text-center space-y-5">
            <CalendarClock className="w-14 h-14 text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">התורים שלי</h2>
            <p className="text-sm text-muted-foreground">הכניסי את מספר הטלפון שלך כדי לראות את התורים</p>

            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="05X-XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10 text-center border-primary/40 focus:border-primary"
                dir="ltr"
              />
            </div>

            <Button onClick={handleSearch} className="w-full" disabled={phone.length < 10}>
              <Search className="w-4 h-4" />
              מצא תורים
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // State B: Bookings list
  return (
    <Layout>
      <div className="py-4 space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">שלום, {savedPhone}</h2>
            <p className="text-xs text-muted-foreground">התורים שלך</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            שינוי
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : searched && bookings.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-4">
            <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-foreground font-semibold">לא נמצאו תורים למספר זה</p>
            <Button onClick={() => navigate('/booking-menu')}>
              <ArrowLeft className="w-4 h-4" />
              הזמינו תור חדש
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
