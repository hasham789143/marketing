
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { Review } from '@/lib/data';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        <Avatar>
          <AvatarFallback>{review.reviewerName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{review.reviewerName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </p>
            </div>
            <StarRating rating={review.rating} size={16} />
          </div>
          <p className="text-sm text-muted-foreground">{review.comment}</p>
        </div>
      </CardContent>
    </Card>
  );
}

    