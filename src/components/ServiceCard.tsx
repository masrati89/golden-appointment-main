import { Clock, Sparkles } from 'lucide-react';

interface ServiceCardProps {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  imageUrl?: string | null;
  onClick: () => void;
}

const ServiceCard = ({ name, description, duration, price, imageUrl, onClick }: ServiceCardProps) => {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] cursor-pointer overflow-hidden animate-fade-in"
    >
      <div className="aspect-video w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{duration} דקות</span>
          </div>
          <span className="text-2xl font-bold text-gold">₪{price}</span>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
