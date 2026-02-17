import { memo } from 'react';
import { Clock } from 'lucide-react';

interface ServiceListItemProps {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  isSelected: boolean;
  onSelect: () => void;
}

const ServiceListItem = memo(({ name, duration_min, price, isSelected, onSelect }: ServiceListItemProps) => (
  <button
    onClick={onSelect}
    className={`w-full glass-card p-4 text-right transition-all duration-200 active:scale-[0.98] border-2 flex items-center justify-between gap-3 min-h-[64px]
      ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-transparent hover:border-primary/30 hover:shadow-sm'}`}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground text-base">{name}</h3>
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-0.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{duration_min} דקות</span>
        </div>
      </div>
    </div>
    <span className="text-lg font-bold text-primary flex-shrink-0">₪{Number(price)}</span>
  </button>
));

ServiceListItem.displayName = 'ServiceListItem';

export default ServiceListItem;
