
import { Suspense } from 'react';
import UsersClient from './users-client';

export default function UsersPage() {
  return (
    <Suspense fallback={<p>Loading users...</p>}>
      <UsersClient />
    </Suspense>
  );
}
