
'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { Product, Review } from '@/lib/data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/ui/star-rating';
import { ReviewCard } from '@/components/review-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function ProductDetailPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const productId = params.productId as string;

  // State for the review form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We need to figure out the shop ID to fetch the product.
  const [shopId, setShopId] = useState<string | null>(null);

  const productDocRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return doc(firestore, `shops/${shopId}/products`, productId);
  }, [firestore, shopId, productId]);

  const reviewsRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/products/${productId}/reviews`);
  }, [firestore, shopId, productId]);

  const { data: product, isLoading: isProductLoading } = useDoc<Product>(productDocRef);
  const { data: reviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsRef);
  
  // This is a workaround to find the shopId.
  // In a real application, you'd probably have the shopId in the route.
  useEffect(() => {
    async function getShopId() {
        if (!firestore || !productId) return;
        
        // This is not efficient, but it's a temporary solution for the demo.
        // A better approach would be to have a direct way to look up the shop for a product.
        const allShopsQuery = collection(firestore, 'shops');
        const querySnapshot = await getDocs(allShopsQuery);
        for(const shopDoc of querySnapshot.docs) {
            const productDoc = doc(firestore, `shops/${shopDoc.id}/products`, productId);
            const productSnapshot = await getDoc(productDoc);
            if (productSnapshot.exists()) {
                setShopId(shopDoc.id);
                return;
            }
        }
    }
    getShopId();
  }, [firestore, productId]);
  
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to leave a review.' });
        return;
    }
    if (rating === 0 || comment.trim() === '') {
        toast({ variant: 'destructive', title: 'Please provide a rating and a comment.' });
        return;
    }
    if (!reviewsRef) return;
    
    setIsSubmitting(true);
    try {
        await addDoc(reviewsRef, {
            reviewId: '', // Firestore will generate this
            reviewerId: user.uid,
            reviewerName: user.displayName || 'Anonymous',
            targetType: 'product',
            targetId: productId,
            rating: rating,
            comment: comment,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Review Submitted!', description: 'Thank you for your feedback.' });
        setRating(0);
        setComment('');
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Failed to submit review', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  if (isProductLoading || !product) {
    return <p>Loading product...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardContent className="p-6 grid md:grid-cols-2 gap-8">
          <div>
            {product.images && product.images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {product.images.map((imgUrl, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square relative w-full rounded-lg overflow-hidden">
                          <Image src={imgUrl} alt={`${product.name} image ${index + 1}`} fill className="object-cover" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              ) : (
                <div className="aspect-square relative w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No Image</p>
                </div>
              )}
          </div>
          <div className="flex flex-col gap-4">
            <Badge variant="outline" className="w-fit">{product.category}</Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>
             <div className="flex items-center gap-2">
                <StarRating rating={averageRating} />
                <span className="text-muted-foreground text-sm">({reviews?.length || 0} reviews)</span>
            </div>
            <p className="text-muted-foreground">{product.description}</p>
             <div className="text-2xl font-bold">
                PKR {product.variants?.[0]?.price.toLocaleString() ?? 'N/A'}
            </div>
            <Button size="lg">Add to Cart</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>
             {areReviewsLoading && <p>Loading reviews...</p>}
             {!areReviewsLoading && (!reviews || reviews.length === 0) && <p className="text-muted-foreground">No reviews yet. Be the first to leave one!</p>}
             <div className="space-y-4">
                {reviews?.map(review => (
                    <ReviewCard key={review.id} review={review} />
                ))}
             </div>
        </div>

        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Write a Review</CardTitle>
                    <CardDescription>Share your thoughts about this product.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                            <label className="font-medium text-sm mb-2 block">Your Rating</label>
                            <StarRating rating={rating} onRatingChange={setRating} editable />
                        </div>
                         <div>
                            <label htmlFor="comment" className="font-medium text-sm mb-2 block">Your Comment</label>
                            <Textarea 
                                id="comment"
                                placeholder="What did you like or dislike?"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                disabled={isSubmitting || !user}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting || !user}>
                            {isSubmitting ? 'Submitting...' : 'Submit Review'}
                        </Button>
                        {!user && <p className="text-xs text-destructive mt-2">You must be logged in to submit a review.</p>}
                    </form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
