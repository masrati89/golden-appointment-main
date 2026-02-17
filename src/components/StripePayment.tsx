import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StripePaymentProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  publishableKey: string;
}

function StripePaymentForm({ bookingId, amount, onSuccess, onError }: Omit<StripePaymentProps, 'publishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get payment intent ID from booking
    const fetchPaymentIntentId = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('stripe_payment_intent_id')
        .eq('id', bookingId)
        .single();
      
      if (data?.stripe_payment_intent_id) {
        setPaymentIntentId(data.stripe_payment_intent_id);
      }
    };

    fetchPaymentIntentId();
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'שגיאה במילוי הטופס');
        setIsProcessing(false);
        return;
      }

      // Get client secret from elements
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'שגיאה באישור התשלום');
        setIsProcessing(false);
        return;
      }

      // Verify payment
      if (!paymentIntentId) {
        throw new Error('חסר payment intent ID');
      }
      
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId, bookingId },
      });

      if (verifyError || !verifyData?.success) {
        throw new Error('שגיאה באימות התשלום');
      }

      toast.success('התשלום בוצע בהצלחה!');
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה בתשלום';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      <Button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full h-12 rounded-xl text-base font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            מעבד תשלום...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            שלם ₪{amount}
          </>
        )}
      </Button>
    </form>
  );
}

export default function StripePayment({ bookingId, amount, onSuccess, onError, publishableKey }: StripePaymentProps) {
  const [stripePromiseInstance, setStripePromiseInstance] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publishableKey) {
      loadStripe(publishableKey).then((stripe) => {
        setStripePromiseInstance(stripe);
      });
    }
  }, [publishableKey]);

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { bookingId, amount, currency: 'ILS' },
        });

        if (error) throw error;
        if (!data?.clientSecret) throw new Error('לא התקבל client secret');

        setClientSecret(data.clientSecret);
        setLoading(false);
      } catch (err: any) {
        onError(err.message || 'שגיאה ביצירת תשלום');
        setLoading(false);
      }
    };

    if (bookingId && amount && stripePromiseInstance) {
      createPaymentIntent();
    }
  }, [bookingId, amount, stripePromiseInstance, onError]);

  if (!stripePromiseInstance || !clientSecret || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="mr-2 text-muted-foreground">טוען טופס תשלום...</span>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <Elements stripe={stripePromiseInstance} options={options}>
      <StripePaymentForm
        bookingId={bookingId}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
