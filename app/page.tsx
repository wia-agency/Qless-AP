import { redirect } from 'next/navigation';

// Root redirects to kitchen dashboard
export default function Home() {
  redirect('/kitchen');
}
