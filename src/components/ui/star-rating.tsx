
'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  totalStars?: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  totalStars = 5,
  size = 20,
  editable = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (index: number) => {
    if (!editable) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (!editable) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (!editable || !onRatingChange) return;
    onRatingChange(index);
  };

  const fullStars = Math.floor(rating);
  const partialStar = rating % 1;
  const emptyStars = totalStars - Math.ceil(rating);

  return (
    <div className={cn("flex items-center gap-1", className)} onMouseLeave={handleMouseLeave}>
      {Array.from({ length: totalStars }, (_, i) => {
        const starIndex = i + 1;
        const displayRating = hoverRating || rating;
        
        return (
          <div 
            key={i} 
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onClick={() => handleClick(starIndex)}
            className={cn(editable && "cursor-pointer")}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(
                'transition-colors',
                starIndex <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

    