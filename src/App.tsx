import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/ClientProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AppLoader } from "@/components/AppLoader";
import Index from "./pages/Index";

// Lazy-loaded routes
const BookingVertical = lazy(() => import("./pages/BookingVertical"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const BlockedSlots = lazy(() => import("./pages/admin/BlockedSlots"));
const ClientLogin = lazy(() => import("./pages/auth/ClientLogin"));
const AuthError = lazy(() => import("./pages/auth/AuthError"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const ClientDashboard = lazy(() => import("./pages/dashboard/ClientDashboard"));

const queryClient = new QueryClient();

/** Initial boot + lazy chunk load: premium AppLoader (no per-page loader on client nav) */
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AdminAuthProvider>
          <BookingProvider>
            <BrowserRouter>
              <ClientAuthProvider>
                <Suspense fallback={<AppLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/booking-menu" element={<BookingVertical />} />
                    <Route path="/book/:serviceId" element={<BookingVertical />} />
                    <Route
                      path="/my-bookings"
                      element={
                        <ClientProtectedRoute>
                          <MyBookings />
                        </ClientProtectedRoute>
                      }
                    />
                    <Route path="/booking-success" element={<BookingSuccess />} />

                    {/* Client Auth routes */}
                    <Route path="/login" element={<ClientLogin />} />
                    <Route path="/auth/login" element={<ClientLogin />} />
                    <Route path="/auth/error" element={<AuthError />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* Client Dashboard (Protected) */}
                    <Route
                      path="/dashboard"
                      element={
                        <ClientProtectedRoute>
                          <ClientDashboard />
                        </ClientProtectedRoute>
                      }
                    />

                    {/* Admin: /admin/login is PUBLIC (no ProtectedRoute) - must stay first */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <AdminLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="bookings" element={<AdminBookings />} />
                      <Route path="services" element={<AdminServices />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="blocked" element={<BlockedSlots />} />
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
