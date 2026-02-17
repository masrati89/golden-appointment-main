import { z } from 'zod';

export const bookingFormSchema = z.object({
  customerName: z
    .string()
    .min(2, 'שם חייב להכיל לפחות 2 תווים')
    .max(50, 'שם ארוך מדי')
    .regex(/^[\u0590-\u05FFa-zA-Z\s'"-]+$/, 'השתמש באותיות עבריות או אנגליות בלבד'),

  customerPhone: z
    .string()
    .regex(/^05\d-?\d{3}-?\d{4}$/, 'מספר טלפון לא תקין (05X-XXX-XXXX)')
    .transform((val) => val.replace(/-/g, '')),

  customerEmail: z
    .string()
    .email('כתובת אימייל לא תקינה')
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .max(500, 'הערות ארוכות מדי')
    .optional(),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
