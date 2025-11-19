
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
import { addDoc, collection, doc, serverTimestamp, getDocs, getDoc, runTransaction } from 'firebase/firestore';
import { Product, ProductVariant, Review, SpecificationValue } from '@/lib/data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/ui/star-rating';
import { ReviewCard } from '@/components/review-card';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Helper to check if two specification arrays are identical
const areSpecificationsEqual = (specs1: SpecificationValue[], specs2: SpecificationValue[]) => {
  if (specs1.length !== specs2.length) return false;
  const sortedSpecs1 = [...specs1].sort((a, b) => a.name.localeCompare(b.name));
  const sortedSpecs2 = [...specs2].sort((a, b) => a.name.localeCompare(b.name));
  return sortedSpecs1.every((spec, index) => spec.name === sortedSpecs2[index].name && spec.value === sortedSpecs2[index].value);
};


export default function ProductDetailPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const productId = params.productId as string;

  const [shopId, setShopId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // State for review form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // State for variant selection
  const [selectedSpecifications, setSelectedSpecifications] = useState<{ [key: string]: string }>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

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
  
  useEffect(() => {
    async function getShopId() {
        if (!firestore || !productId) return;
        
        const allShopsQuery = collection(firestore, 'shops');
        const querySnapshot = await getDocs(allShopsQuery);
        for(const shopDoc of querySnapshot.docs) {
            const productDocRef = doc(firestore, `shops/${shopDoc.id}/products`, productId);
            const productSnapshot = await getDoc(productDocRef);
            if (productSnapshot.exists()) {
                setShopId(shopDoc.id);
                return;
            }
        }
    }
    getShopId();
  }, [firestore, productId]);
  
  useEffect(() => {
    if (product?.images && product.images.length > 0 && !selectedImage) {
        setSelectedImage(product.images[0]);
    }

    // Set default selections for specifications and find the default variant
    if (product?.specificationTypes && product?.variants) {
      const defaultSelections: { [key: string]: string } = {};
      product.specificationTypes.forEach(specType => {
        if (specType.values.length > 0) {
          defaultSelections[specType.name] = specType.values[0];
        }
      });
      setSelectedSpecifications(defaultSelections);
    }

  }, [product, selectedImage]);

  // Effect to find the matching variant whenever selections change
  useEffect(() => {
    if (product?.variants && Object.keys(selectedSpecifications).length > 0) {
      const selectionArray: SpecificationValue[] = Object.entries(selectedSpecifications).map(([name, value]) => ({ name, value }));
      
      const foundVariant = product.variants.find(variant => 
        areSpecificationsEqual(variant.specifications, selectionArray)
      );
      
      setSelectedVariant(foundVariant || null);
    }
  }, [selectedSpecifications, product?.variants]);

  
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
    
    setIsSubmittingReview(true);
    try {
        await addDoc(reviewsRef, {
            reviewId: '',
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
        setIsSubmittingReview(false);
    }
  };
  
  const { averageRating, ratingDistribution } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        ratingDistribution: [
            { rating: 5, count: 0, percentage: 0 },
            { rating: 4, count: 0, percentage: 0 },
            { rating: 3, count: 0, percentage: 0 },
            { rating: 2, count: 0, percentage: 0 },
            { rating: 1, count: 0, percentage: 0 },
        ],
      };
    }

    const totalReviews = reviews.length;
    const avg = reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews;
    
    const distribution = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => r.rating === star).length;
        return {
            rating: star,
            count: count,
            percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0
        };
    });

    return { averageRating: avg, ratingDistribution: distribution };
  }, [reviews]);
  
  const handleSpecificationSelect = (specName: string, specValue: string) => {
    setSelectedSpecifications(prev => ({ ...prev, [specName]: specValue }));
  };
  
  const handleAddToCart = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to add items to your cart.' });
      return;
    }
    if (!selectedVariant || !product || !shopId) {
      toast({ variant: 'destructive', title: 'Variant Not Selected', description: 'Please select all product options before adding to cart.' });
      return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, `shops/${shopId}/products`, productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) throw new Error("Product not found!");

            const productData = productDoc.data() as Product;
            const currentVariant = productData.variants?.find(v => v.sku === selectedVariant.sku);
            if (!currentVariant || currentVariant.stockQty < 1) throw new Error("This variant is out of stock.");

            const cartCollectionRef = collection(firestore, `users/${user.uid}/cart`);
            // Unique ID for cart item based on product and variant SKU
            const cartItemId = `${productId}-${selectedVariant.sku}`;
            const cartItemRef = doc(cartCollectionRef, cartItemId);
            const cartItemDoc = await transaction.get(cartItemRef);

            const quantityInCart = cartItemDoc.exists() ? cartItemDoc.data().quantity : 0;
            if (currentVariant.stockQty <= quantityInCart) throw new Error("Not enough items in stock.");
            
            if (cartItemDoc.exists()) {
                transaction.update(cartItemRef, { quantity: quantityInCart + 1 });
            } else {
                transaction.set(cartItemRef, {
                    id: cartItemId,
                    productId: productId,
                    name: product.name,
                    price: selectedVariant.price,
                    quantity: 1,
                    sku: selectedVariant.sku,
                    imageUrl: product.images?.[0] || null,
                    shopId: shopId,
                });
            }
        });
      toast({ title: 'Added to Cart', description: `${product.name} (${selectedVariant.specifications.map(s => s.value).join('/')}) added.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to Add to Cart', description: error.message });
    }
  };


  if (isProductLoading || !product) {
    return <p>Loading product...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardContent className="p-6 grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
              <div className="aspect-square relative w-full rounded-lg overflow-hidden border">
                   {selectedImage ? (
                    <Image src={selectedImage} alt={product.name} fill className="object-cover" />
                    ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">No Image</p>
                    </div>
                   )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                {product.images.map((imgUrl, index) => (
                    <div 
                        key={index}
                        className={cn(
                            "aspect-square relative w-full rounded-md overflow-hidden border-2 cursor-pointer transition-all",
                            selectedImage === imgUrl ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                        onClick={() => setSelectedImage(imgUrl)}
                    >
                    <Image src={imgUrl} alt={`${product.name} thumbnail ${index + 1}`} fill className="object-cover" />
                    </div>
                ))}
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
            
            {product.specificationTypes && product.specificationTypes.length > 0 && (
                <div className="space-y-4 pt-4">
                    {product.specificationTypes.map(specType => (
                        <div key={specType.name}>
                            <Label className="font-bold">{specType.name}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {specType.values.map(value => (
                                    <Button
                                        key={value}
                                        variant={selectedSpecifications[specType.name] === value ? 'default' : 'outline'}
                                        onClick={() => handleSpecificationSelect(specType.name, value)}
                                        size="sm"
                                    >
                                        {value}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Separator />

             <div className="text-2xl font-bold">
                PKR {selectedVariant ? selectedVariant.price.toLocaleString() : 'N/A'}
            </div>
             <p className={`text-sm font-medium ${selectedVariant && selectedVariant.stockQty > 5 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedVariant ? `${selectedVariant.stockQty} in stock` : "Select options to see stock"}
            </p>
            <Button size="lg" onClick={handleAddToCart} disabled={!selectedVariant || selectedVariant.stockQty <= 0}>
                {selectedVariant && selectedVariant.stockQty <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
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

        <div className="space-y-6">
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
                                disabled={isSubmittingReview || !user}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmittingReview || !user}>
                            {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                        {!user && <p className="text-xs text-destructive mt-2">You must be logged in to submit a review.</p>}
                    </form>
                </CardContent>
            </Card>

            {reviews && reviews.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {ratingDistribution.map(item => (
                            <div key={item.rating} className="flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-1 w-16">
                                    <span>{item.rating}</span>
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                </div>
                                <Progress value={item.percentage} className="w-full h-2" />
                                <span className="w-10 text-right text-muted-foreground">{item.count}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}

    