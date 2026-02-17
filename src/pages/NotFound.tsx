import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
    >
      <div className="glass-card p-8 text-center max-w-md w-full">
        <h1 className="mb-4 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">הדף לא נמצא</p>
        <a
          href="/"
          className="inline-block h-12 px-8 leading-[3rem] rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
        >
          חזרה לדף הבית
        </a>
      </div>
    </div>
  );
};

export default NotFound;
