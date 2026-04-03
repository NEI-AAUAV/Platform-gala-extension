import { useEffect, useState } from "react";

type CountdownProps = {
  targetDate: string;
  onComplete?: () => void;
  className?: string;
  label?: string;
};

export default function Countdown({ targetDate, onComplete, className, label }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
        if (onComplete) onComplete();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {label && <span className="text-[0.6rem] uppercase tracking-widest text-light-gold/50">{label}</span>}
      <div className="flex gap-3 font-mono text-xl font-bold text-light-gold">
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="text-[0.5rem] uppercase opacity-50">Dias</span>
        </div>
        <span className="opacity-30">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[0.5rem] uppercase opacity-50">Hrs</span>
        </div>
        <span className="opacity-30">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[0.5rem] uppercase opacity-50">Min</span>
        </div>
        <span className="opacity-30">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[0.5rem] uppercase opacity-50">Seg</span>
        </div>
      </div>
    </div>
  );
}
