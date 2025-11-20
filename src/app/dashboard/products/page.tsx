
'use client';
import { Suspense } from 'react';
import { ProductTable } from '@/components/product-table';
import { useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface UserData {
  role: string;
}

export default function ProductsPage() {
    const { user, isUserLoading } = useUser();

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user]);

    // Note: It's okay to call firestore here because it's initialized in a parent provider
    // and this component is still a client component at its root.
    const { getFirestore } = require('firebase/firestore');
    const firestore = getFirestore();

    const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
    const isOwner = userData?.role === 'owner';
    const isLoading = isUserLoading || isUserDataLoading;

    return (
        <div className="p-4 md:p-6 lg:p-8">
             <Suspense fallback={<p>Loading products...</p>}>
                <ProductTable isOwner={isOwner} user={user} isLoading={isLoading} />
             </Suspense>
        </div>
    );
}
