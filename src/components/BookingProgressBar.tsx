import { Check, Calendar, Clock, User, CheckCircle } from 'lucide-react';

type BookingStep = 'date' | 'time' | 'details' | 'confirmation';

interface BookingProgressBarProps {
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
}

const steps: { key: BookingStep; label: string; icon: React.ElementType }[] = [
  { key: 'date', label: 'תאריך', icon: Calendar },
  { key: 'time', label: 'שעה', icon: Clock },
  { key: 'details', label: 'פרטים', icon: User },
  { key: 'confirmation', label: 'אישור', icon: CheckCircle },
];

const BookingProgressBar = ({ currentStep, onStepClick }: BookingProgressBarProps) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-md border-b border-border py-3 -mx-4 px-4 mb-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isClickable = isCompleted;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.key)}
                  disabled={!isClickable}
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all
                    ${isCompleted
                      ? 'bg-gold/20 text-gold border-2 border-gold cursor-pointer'
                      : isCurrent
                        ? 'bg-gold text-primary-foreground shadow-md scale-110'
                        : 'bg-muted text-muted-foreground opacity-40'}
                    ${!isClickable && !isCurrent ? 'cursor-default' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </button>
                <span
                  className={`text-[10px] mt-1 font-medium ${
                    isCurrent ? 'text-gold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 mt-[-12px] transition-colors ${
                    i < currentIndex ? 'bg-gold' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingProgressBar;
