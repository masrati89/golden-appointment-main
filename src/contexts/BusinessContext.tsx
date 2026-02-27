/**
 * BusinessContext
 * ---------------
 * מספק את נתוני העסק הנוכחי לכל הקומפוננטות באפליקציה.
 * נטען לפי ה-slug מה-URL: /b/:slug
 *
 * כל hook שמשתמש ב-business_id (useSettings, useServices וכו')
 * מקבל אותו מכאן — מקור אמת אחד לכל העמוד.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { saveBusinessSlug } from '@/lib/businessSlug';

interface Business {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
}

interface BusinessContextType {
  business: Business | null;
  businessId: string | null;
  isLoading: boolean;
  notFound: boolean;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

async function fetchBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase
    .rpc('get_business_by_slug', { p_slug: slug });

  if (error) throw error;
  // rpc מחזיר מערך — נחזיר את השורה הראשונה
  return (data as Business[])?.[0] ?? null;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();

  // Persist the slug so logout and home buttons can redirect back to this business.
  useEffect(() => {
    if (slug) saveBusinessSlug(slug);
  }, [slug]);

  const { data: business, isLoading, isError } = useQuery({
    queryKey: ['business', slug],
    queryFn: () => fetchBusinessBySlug(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 דקות — נתוני עסק משתנים לעיתים רחוקות
    retry: 1,
  });

  // Update browser tab title once business data is available.
  // Must be AFTER useQuery so `business` is already declared.
  useEffect(() => {
    if (business?.name) {
      document.title = `${business.name} | הזמנת תור`;
    }
    return () => {
      document.title = 'זימון תורים';
    };
  }, [business?.name]);

  return (
    <BusinessContext.Provider
      value={{
        business: business ?? null,
        businessId: business?.id ?? null,
        isLoading,
        notFound: !isLoading && (isError || business === null),
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}

export function useBusinessSafe() {
  const ctx = useContext(BusinessContext);
  return ctx ?? { business: null, businessId: null, isLoading: false, notFound: false };
}
