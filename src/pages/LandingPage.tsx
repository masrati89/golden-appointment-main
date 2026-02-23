/**
 * LandingPage — /
 * ──────────────────
 * Marketing landing page for Golden Appointment.
 * 9 sections: Nav, Hero, Stats, Pain→Solution, Features,
 *             Testimonials, Pricing, FAQ, Footer.
 *
 * Scroll animations: native Intersection Observer (via FadeIn component).
 * Design: matches existing Heebo / gold-brand design system.
 * RTL Hebrew, mobile-first (375 → 768 → 1280 px).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MessageCircle,
  CreditCard,
  Heart,
  BarChart3,
  Smartphone,
  Star,
  CheckCircle,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Zap,
  Clock,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// ─── Intersection Observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

// ─── FadeIn wrapper component ──────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  className?: string;
}) {
  const [ref, isVisible] = useInView();

  const hidden = {
    up: 'opacity-0 translate-y-8',
    left: 'opacity-0 -translate-x-8',
    right: 'opacity-0 translate-x-8',
    none: 'opacity-0',
  }[direction];

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${className} ${
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : hidden
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Scroll to section helper ──────────────────────────────────────────────────
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Navigation ────────────────────────────────────────────────────────────────
function NavBar({ onCTAClick }: { onCTAClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Track scroll on the landing-page scroll container
  useEffect(() => {
    const container = document.getElementById('landing-scroll');
    if (!container) return;

    const onScroll = () => setScrolled(container.scrollTop > 60);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'תכונות', id: 'features' },
    { label: 'עדויות', id: 'testimonials' },
    { label: 'תמחור', id: 'pricing' },
    { label: 'שאלות', id: 'faq' },
  ];

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => scrollToSection('hero')}
          className="flex items-center gap-2 group"
          aria-label="Golden Appointment"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <span
            className={`font-bold text-lg tracking-tight hidden sm:block transition-colors ${
              scrolled ? 'text-foreground' : 'text-foreground'
            }`}
          >
            Golden<span className="text-primary"> Appointment</span>
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('pricing')}>
            כניסה
          </Button>
          <Button
            size="sm"
            className="h-9 px-5 transition-transform duration-200 hover:scale-[1.02]"
            onClick={onCTAClick}
          >
            התחל חינם
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="תפריט"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-border px-4 py-4 space-y-3 shadow-lg">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { scrollToSection(link.id); setMenuOpen(false); }}
              className="block w-full text-right text-sm text-foreground py-2 font-medium hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setMenuOpen(false)}>
              כניסה
            </Button>
            <Button size="sm" className="w-full" onClick={() => { onCTAClick(); setMenuOpen(false); }}>
              התחל חינם
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({ onCTAClick, onDemoClick }: { onCTAClick: () => void; onDemoClick: () => void }) {
  return (
    <section
      id="hero"
      className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 pt-20 pb-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFF9F5 0%, #FFFDF9 50%, #FFF5EC 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium border border-primary/20">
          <Zap className="w-3.5 h-3.5" />
          מערכת ניהול תורים מס׳ 1 בישראל
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
          ניהול תורים חכם
          <br />
          <span className="text-primary">לעסק שלך</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          מערכת SaaS מתקדמת לעסקים ישראליים — הזמנת תורים אוטומטית,
          תזכורות WhatsApp, תשלומים ותוכנית נאמנות. הכל במקום אחד.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            size="lg"
            className="h-13 px-8 text-base font-semibold shadow-gold-md hover:shadow-gold-lg hover:scale-[1.02] transition-transform duration-200"
            onClick={onCTAClick}
          >
            התחל ניסיון חינם — 14 יום
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-13 px-8 text-base font-semibold border-primary/40 text-primary hover:bg-primary/5"
            onClick={onDemoClick}
          >
            צפה בדמו
          </Button>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
          {[
            { icon: Users, value: '500+', label: 'עסקים פעילים' },
            { icon: Calendar, value: '10,000+', label: 'תורים הוזמנו' },
            { icon: Star, value: '4.9/5', label: 'דירוג ממוצע' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{value}</span>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* App mockup placeholder */}
        <div className="mt-8 mx-auto w-full max-w-2xl">
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-primary/15 shadow-gold-lg">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 h-5 bg-secondary rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'תורים היום', value: '8', color: 'bg-primary/10 text-primary' },
                { label: 'הכנסות החודש', value: '₪4,200', color: 'bg-green-500/10 text-green-700' },
                { label: 'לקוחות חדשים', value: '12', color: 'bg-blue-500/10 text-blue-700' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-3 ${stat.color} text-center`}>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs mt-0.5 opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {['שירה לוי — צבע שיער 14:00', 'דני כהן — תספורת 15:30', 'מיכל גורן — טיפול פנים 17:00'].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm"
                >
                  <span className="text-foreground">{row}</span>
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    מאושר
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <button
        onClick={() => scrollToSection('pain')}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors animate-bounce"
        aria-label="גלול למטה"
      >
        <span className="text-xs">גלול למטה</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    </section>
  );
}

// ─── Pain → Solution ───────────────────────────────────────────────────────────
function PainSection() {
  const pairs = [
    {
      pain: { emoji: '😩', text: 'מבלה שעות על ניהול תורים ידני בטלפון' },
      solution: { emoji: '🚀', text: 'הזמנת תורים אוטומטית 24/7 — הלקוחות מזמינים בלי להתקשר' },
    },
    {
      pain: { emoji: '😤', text: 'לקוחות שוכחים את התור ומבטלים ברגע האחרון' },
      solution: { emoji: '💬', text: 'תזכורות WhatsApp אוטומטיות 24 שעות לפני כל תור' },
    },
    {
      pain: { emoji: '😟', text: 'אין לך תמונה ברורה של הכנסות והיסטוריית לקוחות' },
      solution: { emoji: '📊', text: 'דשבורד ניהולי מלא עם אנליטיקס ודו"חות בזמן אמת' },
    },
  ];

  return (
    <section id="pain" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">הבעיה והפתרון</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            אנחנו מכירים את הכאבים שלך
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Golden Appointment נבנתה כדי לפתור בדיוק את האתגרים שעסקים קטנים מתמודדים איתם יום יום
          </p>
        </FadeIn>

        <div className="space-y-6">
          {pairs.map((pair, i) => (
            <FadeIn key={i} delay={i * 100} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pain */}
              <div className="glass-card p-5 rounded-2xl border border-red-100 bg-red-50/30 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-lg">
                  {pair.pain.emoji}
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">הבעיה</p>
                  <p className="text-foreground font-medium">{pair.pain.text}</p>
                </div>
              </div>
              {/* Solution */}
              <div className="glass-card p-5 rounded-2xl border border-green-100 bg-green-50/30 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-lg">
                  {pair.solution.emoji}
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">הפתרון</p>
                  <p className="text-foreground font-medium">{pair.solution.text}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: 'ניהול לוח שנה',
      description: 'תצוגה יומית, שבועית וחודשית. חסימת שעות, ניהול הפסקות ושעות פעילות מותאמות אישית.',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp אוטומטי',
      description: 'תזכורות ואישורי תור נשלחים אוטומטית ללקוחות — ללא מאמץ מצדך.',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: CreditCard,
      title: 'קבלת תשלומים',
      description: 'קבל מקדמות ותשלומים מלאים מראש. שלב Stripe בקלות ללא ידע טכני.',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Heart,
      title: 'תוכנית נאמנות',
      description: 'הגדל נאמנות לקוחות עם נקודות על כל תור וקופונים אוטומטיים לחברי מועדון.',
      color: 'bg-pink-50 text-pink-600',
    },
    {
      icon: BarChart3,
      title: 'אנליטיקס ודו״חות',
      description: 'ראה מה עובד — הכנסות, לקוחות חוזרים, שירותים פופולריים ומגמות עסקיות.',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: Smartphone,
      title: 'Mobile-First',
      description: 'ממשק מותאם לנייד מלא — ניהול העסק שלך מכל מקום, בכל רגע.',
      color: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <section id="features" className="py-20 px-4" style={{ background: '#FFF9F5' }}>
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">תכונות</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            כל מה שעסק שלך צריך
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            פלטפורמה אחת שמחליפה 6 כלים שונים — חסוך זמן, כסף וכאב ראש
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 80} direction={i % 2 === 0 ? 'left' : 'right'}>
              <div className="glass-card p-6 rounded-2xl h-full hover:shadow-gold-md transition-shadow duration-300 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feat.color} transition-transform group-hover:scale-110`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'שירה לוי',
      role: 'מכון יופי, תל אביב',
      avatar: 'ש',
      stars: 5,
      text: 'מאז שהתחלתי להשתמש ב-Golden Appointment חסכתי לפחות 3 שעות ביום. הלקוחות שלי מזמינים לבד בלילה ואני מתעוררת עם תורים מלאים.',
    },
    {
      name: 'דני כהן',
      role: 'ספר מקצועי, חיפה',
      avatar: 'ד',
      stars: 5,
      text: 'הלקוחות שלי מאוד אוהבים שהם יכולים להזמין תור ב-24/7. הביטולים ירדו בכ-70% מאז שהתחלנו לשלוח תזכורות WhatsApp אוטומטיות.',
    },
    {
      name: 'ריבה מזרחי',
      role: 'קוסמטיקאית, ירושלים',
      avatar: 'ר',
      stars: 5,
      text: 'הדשבורד הניהולי שינה לי את חיי. סוף סוף אני יודעת אילו שירותים הכי רווחיים ואילו לקוחות הכי נאמנים לי.',
    },
  ];

  return (
    <section id="testimonials" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">עדויות</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            מה העסקים אומרים עלינו
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            עסקים ישראלים שכבר עושים יותר עם פחות מאמץ
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 120}>
              <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground text-sm leading-relaxed flex-1 mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────
function PricingSection({ onCTAClick }: { onCTAClick: () => void }) {
  const included = [
    'הזמנת תורים אוטומטית 24/7',
    'תזכורות WhatsApp ללקוחות',
    'דשבורד ניהולי מלא',
    'אנליטיקס ודו"חות',
    'תוכנית נאמנות וקופונים',
    'קבלת מקדמות ותשלומים',
    'סנכרון Google Calendar',
    'תמיכה בעברית 24/7',
    'ניסיון חינם 14 יום',
  ];

  return (
    <section id="pricing" className="py-20 px-4" style={{ background: '#FFF9F5' }}>
      <div className="max-w-lg mx-auto">
        <FadeIn className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">תמחור</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            מחיר פשוט ושקוף
          </h2>
          <p className="text-muted-foreground mt-3">
            ללא הפתעות, ללא עמלות נסתרות
          </p>
        </FadeIn>

        <FadeIn>
          <div className="glass-card rounded-2xl p-8 border-2 border-primary/30 shadow-gold-xl relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              הפופולרי ביותר
            </div>

            {/* Decorative bg */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />

            <div className="relative z-10 text-center mb-8">
              <h3 className="text-xl font-bold text-foreground mb-1">תוכנית פרו</h3>
              <p className="text-sm text-muted-foreground mb-4">הכל כלול, ללא הגבלות</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold text-foreground">₪199</span>
                <span className="text-muted-foreground mb-2">/ חודש</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">או ₪1,990 / שנה (חיסכון של 2 חודשים)</p>
            </div>

            <ul className="space-y-3 mb-8">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-12 text-base font-semibold hover:scale-[1.02] transition-transform duration-200"
              onClick={onCTAClick}
            >
              התחל ניסיון חינם 14 יום
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              ללא כרטיס אשראי. ביטול בכל עת.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FAQSection() {
  const faqs = [
    {
      q: 'האם יש תקופת ניסיון חינמית?',
      a: 'כן! אתה מקבל 14 יום ניסיון חינמי מלא ללא צורך בכרטיס אשראי. אחרי 14 הימים תוכל לבחור להמשיך עם המנוי או לבטל — בלי שום התחייבות.',
    },
    {
      q: 'כמה לקוחות יכולים להזמין תורים?',
      a: 'אין הגבלה! בתוכנית הפרו שלנו מספר הלקוחות, התורים וההזמנות הוא בלתי מוגבל. שלם מחיר קבוע ותגדל בלי לדאוג.',
    },
    {
      q: 'האם ניתן לסנכרן עם Google Calendar?',
      a: 'בהחלט. Golden Appointment מתחבר ישירות ל-Google Calendar שלך — כל תור שנקבע מופיע אוטומטית ביומן וכל שינוי מתעדכן בשני הכיוונים.',
    },
    {
      q: 'מה קורה אם אני רוצה לבטל?',
      a: 'ביטול מיידי ובלי קנסות. תוכל לבטל את המנוי בכל עת מהגדרות החשבון שלך. לאחר הביטול תמשיך ליהנות מהשירות עד סוף תקופת החיוב הנוכחית.',
    },
    {
      q: 'האם יש תמיכה טכנית בעברית?',
      a: 'כן! הצוות שלנו זמין בעברית בימים א׳–ו׳ בשעות 9:00–18:00. בנוסף, יש לנו מדריכי וידאו, מאמרי עזרה ו-chat support שמגיב תוך שעה.',
    },
    {
      q: 'האם הנתונים שלי מאובטחים?',
      a: 'אבטחה היא עדיפות ראשונה שלנו. כל הנתונים מוצפנים ב-TLS, שמורים בשרתים ישראלים ומגובים מדי יום. אנחנו עומדים בתקנות פרטיות מחמירות.',
    },
  ];

  return (
    <section id="faq" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <FadeIn className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">שאלות נפוצות</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            יש לך שאלות? יש לנו תשובות
          </h2>
        </FadeIn>

        <FadeIn>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="glass-card border border-border rounded-xl px-5 overflow-hidden"
              >
                <AccordionTrigger className="text-right font-semibold text-foreground hover:no-underline py-4 text-sm sm:text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────
function CTASection({ onCTAClick }: { onCTAClick: () => void }) {
  return (
    <section
      className="py-24 px-4 text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #C5A065 0%, #D4B896 50%, #C5A065 100%)' }}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            מוכן להצמיח את העסק שלך?
          </h2>
          <p className="text-white/85 text-lg mb-8 max-w-lg mx-auto">
            הצטרף ל-500+ עסקים שכבר חוסכים זמן ומרוויחים יותר עם Golden Appointment
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl"
              onClick={onCTAClick}
            >
              התחל ניסיון חינם — 14 יום
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </div>
          <p className="text-white/70 text-sm mt-4">
            <CheckCircle className="w-3.5 h-3.5 inline ml-1" />
            ללא כרטיס אשראי &nbsp;·&nbsp;
            <CheckCircle className="w-3.5 h-3.5 inline ml-1" />
            ביטול בכל עת &nbsp;·&nbsp;
            <CheckCircle className="w-3.5 h-3.5 inline ml-1" />
            הגדרה תוך 5 דקות
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const links = [
    { label: 'מוצר', items: ['תכונות', 'תמחור', 'דמו', 'עדכונים'] },
    { label: 'חברה', items: ['אודות', 'בלוג', 'קריירה', 'צור קשר'] },
    { label: 'תמיכה', items: ['מרכז עזרה', 'תיעוד API', 'מדיניות פרטיות', 'תנאי שימוש'] },
  ];

  return (
    <footer className="bg-foreground text-white/80 py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-white text-lg">
                Golden<span className="text-primary"> Appointment</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60 max-w-xs">
              מערכת ניהול תורים חכמה לעסקים ישראליים. חוסכים לך זמן, מגדילים לך הכנסות.
            </p>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="w-3.5 h-3.5" />
              תמיכה א׳–ו׳ 9:00–18:00
            </div>
          </div>

          {/* Link groups */}
          {links.map((group) => (
            <div key={group.label}>
              <h4 className="font-semibold text-white text-sm mb-4">{group.label}</h4>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item}>
                    <button className="text-sm text-white/60 hover:text-white transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Golden Appointment. כל הזכויות שמורות.
          </p>
          <p className="text-xs text-white/30">
            מיוצר עם ❤️ בישראל
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  const handleCTA = useCallback(() => {
    navigate('/admin/login');
  }, [navigate]);

  const handleDemo = useCallback(() => {
    navigate('/dashboard?demo=true');
  }, [navigate]);

  return (
    /*
     * The body has overflow:hidden + height:100dvh (set globally in index.css).
     * We create our own scroll container here so the landing page is scrollable.
     */
    <div
      id="landing-scroll"
      className="h-[100dvh] overflow-y-auto overflow-x-hidden"
      dir="rtl"
    >
      <NavBar onCTAClick={handleCTA} />
      <HeroSection onCTAClick={handleCTA} onDemoClick={handleDemo} />
      <PainSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection onCTAClick={handleCTA} />
      <FAQSection />
      <CTASection onCTAClick={handleCTA} />
      <Footer />
    </div>
  );
}
