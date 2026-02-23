import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/ClientProtectedRoute";
import SuperAdminLayout, { SuperAdminRoute } from "@/components/super-admin/SuperAdminLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AppLoader } from "@/components/AppLoader";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RouteTransitionLoader } from "@/components/RouteTransitionLoader";
import { AmbientBackground } from "@/components/AmbientBackground";
// Lazy-loaded routes
const BusinessPage      = lazy(() => import("./pages/BusinessPage"));
const BookingVertical   = lazy(() => import("./pages/BookingVertical"));
const BookingSuccess    = lazy(() => import("./pages/BookingSuccess"));
const MyBookings        = lazy(() => import("./pages/MyBookings"));
const NotFound          = lazy(() => import("./pages/NotFound"));
const AdminLogin        = lazy(() => import("./pages/admin/Login"));
const AdminLayout       = lazy(() => import("./components/AdminLayout"));
const AdminDashboard    = lazy(() => import("./pages/admin/Dashboard"));
const AdminBookings     = lazy(() => import("./pages/admin/Bookings"));
const AdminServices     = lazy(() => import("./pages/admin/Services"));
const AdminSettings     = lazy(() => import("./pages/admin/Settings"));
const AdminAnalytics    = lazy(() => import("./pages/admin/Analytics"));
const BlockedSlots      = lazy(() => import("./pages/admin/BlockedSlots"));
const AdminLoyalty      = lazy(() => import("./pages/admin/Loyalty"));
const LoyaltyPage       = lazy(() => import("./pages/LoyaltyPage"));
const CustomerRegister  = lazy(() => import("./pages/CustomerRegister"));
const LandingPage       = lazy(() => import("./pages/LandingPage"));
const ClientLogin       = lazy(() => import("./pages/auth/ClientLogin"));
const AuthError         = lazy(() => import("./pages/auth/AuthError"));
const AuthCallback      = lazy(() => import("./pages/auth/AuthCallback"));
const ClientDashboard   = lazy(() => import("./pages/dashboard/ClientDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/SuperAdminDashboard"));
const BusinessDetail      = lazy(() => import("./pages/super-admin/BusinessDetail"));
const NewBusinessForm     = lazy(() => import("./pages/super-admin/NewBusinessForm"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,      // 3 דקות — נתונים נחשבים טריים
      gcTime: 30 * 60 * 1000,         // 30 דקות — קאש נשמר בזיכרון
      retry: 1,                        // ניסיון חוזר אחד בלבד על שגיאה
      refetchOnWindowFocus: false,     // לא refresh אוטומטי בחזרה לחלון
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AmbientBackground />
      <LoadingScreen />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AdminAuthProvider>
          <BookingProvider>
            <BrowserRouter>
              <RouteTransitionLoader />
              <ClientAuthProvider>
                <Suspense fallback={<AppLoader />}>
                  <Routes>

                    {/* ─── דפי עסק (SaaS) ─────────────────────────────── */}
                    {/*
                     * /b/:slug         — דף נחיתה של עסק ספציפי
                     * /b/:slug/book    — זרימת הזמנת תור
                     * /b/:slug/success — אישור הזמנה
                     *
                     * BusinessProvider עוטף את כל הנתיבים האלה
                     * ומספק את ה-businessId לכל הקומפוננטות בפנים.
                     */}
                    <Route path="/b/:slug" element={
                      <BusinessProvider>
                        <BusinessPage />
                      </BusinessProvider>
                    } />
                    <Route path="/b/:slug/book" element={
                      <BusinessProvider>
                        <BookingVertical />
                      </BusinessProvider>
                    } />
                    <Route path="/b/:slug/success" element={
                      <BusinessProvider>
                        <BookingSuccess />
                      </BusinessProvider>
                    } />
                    <Route path="/b/:slug/loyalty" element={
                      <BusinessProvider>
                        <LoyaltyPage />
                      </BusinessProvider>
                    } />

                    {/* ─── דפים ציבוריים ─────────────────────────────────── */}
                    {/* H-1: Legacy routes /booking-menu and /book/:serviceId removed —
                     *   they rendered BookingVertical without a BusinessProvider,
                     *   so businessId was always null (no tenant isolation). */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/booking-success" element={<BookingSuccess />} />

                    {/* ─── אימות לקוח ─────────────────────────────────── */}
                    <Route path="/login" element={<ClientLogin />} />
                    <Route path="/auth/login" element={<ClientLogin />} />
                    <Route path="/auth/error" element={<AuthError />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* ─── הרשמת לקוח — נדרש אחרי magic-link auth ────── */}
                    <Route path="/register/customer" element={
                      <ClientProtectedRoute><CustomerRegister /></ClientProtectedRoute>
                    } />

                    {/* ─── לקוח מחובר ─────────────────────────────────── */}
                    <Route path="/my-bookings" element={
                      <ClientProtectedRoute><MyBookings /></ClientProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <ClientProtectedRoute><ClientDashboard /></ClientProtectedRoute>
                    } />

                    {/* ─── אדמין ───────────────────────────────────────── */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={
                      <ProtectedRoute><AdminLayout /></ProtectedRoute>
                    }>
                      <Route path="dashboard"  element={<AdminDashboard />} />
                      <Route path="bookings"   element={<AdminBookings />} />
                      <Route path="services"   element={<AdminServices />} />
                      <Route path="settings"   element={<AdminSettings />} />
                      <Route path="analytics"  element={<AdminAnalytics />} />
                      <Route path="blocked"    element={<BlockedSlots />} />
                      <Route path="loyalty"    element={<AdminLoyalty />} />
                    </Route>

                    <Route
                      path="/super-admin"
                      element={
                        <SuperAdminRoute>
                          <SuperAdminLayout />
                        </SuperAdminRoute>
                      }
                    >
                      <Route path="dashboard"      element={<SuperAdminDashboard />} />
                      <Route path="businesses"     element={<SuperAdminDashboard />} />
                      <Route path="businesses/new" element={<NewBusinessForm />} />
                      <Route path="businesses/:id" element={<BusinessDetail />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ClientAuthProvider>
            </BrowserRouter>
          </BookingProvider>
        </AdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
