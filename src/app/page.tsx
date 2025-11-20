
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is determined
    }

    if (user) {
      const checkUserRoleAndRedirect = async () => {
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const role = userDoc.data().role;
              switch (role) {
                case 'admin':
                  router.push('/dashboard/shops');
                  break;
                case 'owner':
                case 'staff':
                  router.push('/dashboard');
                  break;
                case 'customer':
                  router.push('/customer/products');
                  break;
                default:
                  router.push('/login'); // Fallback for users with no role
              }
            } else {
              // If no user document, assume customer
              router.push('/customer/products');
            }
        } catch (error: any) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get'
            }));
        }
      };
      checkUserRoleAndRedirect();
    } else {
      // If no user is logged in, redirect to the login page
      router.push('/login');
    }
  }, [user, isUserLoading, firestore, router]);

  // Display a loading indicator while checking auth status
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <p>Loading...</p>
    </div>
  );
}

    