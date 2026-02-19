import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, startOfDay } from 'date-fns';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CalendarClock, LogOut, Sparkles, Image as ImageIcon, Clock, CheckCircle, XCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingCardSkeleton } from '@/components/skeletons/BookingCardSkeleton';
import { ImageGridSkeleton } from '@/components/skeletons/ImageGridSkeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import { motion } from 'framer-motion';

interface BookingWithService {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string | null;
  total_price: number;
  customer_name: string;
  customer_email: string | null;
  services: { name: string } | null;
}

export default function ClientDashboard() {
  const { user, logout, isLoading: authLoading } = useClientAuth();
  const navigate = useNavigate();

  // Query bookings for authenticated user (RLS enforced)
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, booking_time, status, total_price, customer_name, customer_email, services:service_id(name)')
        .eq('customer_email', user.email)
        .order('booking_date', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching bookings:', error);
        toast.error('שגיאה בטעינת התורים', {
          description: error.message,
        });
        return [];
      }

      return (data || []) as BookingWithService[];
    },
    enabled: !!user?.email,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Query portfolio images from portfolio_images table (if linked to user bookings)
  const { data: portfolioImages, isLoading: imagesLoading } = useQuery({
    queryKey: ['client-portfolio', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      // For now, return empty array - portfolio_images table doesn't have user linkage
      // This can be extended later when portfolio_images table is linked to bookings/users
      return [];
    },
    enabled: !!user?.email,
  });

  const today = startOfDay(new Date());

  const { upcoming, history } = useMemo(() => {
    const up: BookingWithService[] = [];
    const hist: BookingWithService[] = [];
    bookings?.forEach((b) => {
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
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">מאושר</Badge>;
      case 'pending':
        return <Badge className="bg-primary/20 text-primary border-primary/30">ממתין</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">בוטל</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-muted-foreground border-muted">הושלם</Badge>;
      default:
        return <Badge variant="outline">{status || 'לא ידוע'}</Badge>;
    }
  };

  const handleLogout = async () => {
    try {
      toast.success('מתנתק...', { duration: 1000 });
      await logout();
      // logout() already handles navigation via window.location.href
      // No need for additional navigate call
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('שגיאה בהתנתקות');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const isEmpty = !bookingsLoading && (!bookings || bookings.length === 0);

  return (
    <div className="min-h-[100svh] pb-safe" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">הכספת שלי</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">דף הבית</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                התנתק
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Empty State */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 sm:py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">ברוכים הבאים למכון היופי שלך</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              כאן תוכלו לראות את כל התורים שלכם, תמונות לפני ואחרי, והיסטוריית הטיפולים.
            </p>
            <Button
              onClick={() => navigate('/booking-menu')}
              className="h-12 px-8 rounded-xl"
            >
              קבע תור ראשון
            </Button>
          </motion.div>
        )}

        {/* Upcoming Bookings */}
        {!isEmpty && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              תורים קרובים
            </h2>
            {bookingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BookingCardSkeleton key={i} />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 sm:p-6 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{booking.services?.name || 'שירות'}</h3>
                        <p className="text-sm text-muted-foreground">{booking.customer_name}</p>
                      </div>
                      {statusBadge(booking.status)}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy')} בשעה {booking.booking_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-foreground">₪{Number(booking.total_price).toFixed(0)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">אין תורים קרובים</p>
            )}
          </section>
        )}

        {/* Portfolio Images - Placeholder for future feature */}
        {false && portfolioImages && portfolioImages.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              תמונות לפני ואחרי
            </h2>
            {imagesLoading ? (
              <ImageGridSkeleton count={6} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {portfolioImages.map((img, idx) => (
                  <motion.div
                    key={`${img.url}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    <OptimizedImage
                      src={img.url}
                      alt={img.caption || 'תמונה'}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* History */}
        {!isEmpty && history.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              היסטוריה
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 sm:p-6 rounded-xl opacity-75"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{booking.services?.name || 'שירות'}</h3>
                      <p className="text-sm text-muted-foreground">{booking.customer_name}</p>
                    </div>
                    {statusBadge(booking.status)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy')} בשעה {booking.booking_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="text-foreground">₪{Number(booking.total_price).toFixed(0)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
