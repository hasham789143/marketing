
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { Review } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  // Helper to safely convert Firestore Timestamp or string to a Date object
  const getReviewDate = (createdAt: Review['createdAt']): Date | null => {
    if (!createdAt) return null;
    if (typeof createdAt === 'string') {
      return new Date(createdAt);
    }
    // Check if it's a Firestore Timestamp object
    if (createdAt && typeof (createdAt as Timestamp).toDate === 'function') {
      return (createdAt as Timestamp).toDate();
    }
    return null;
  };

  const reviewDate = getReviewDate(review.createdAt);

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
                {reviewDate
                  ? formatDistanceToNow(reviewDate, { addSuffix: true })
                  : 'just now'}
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
