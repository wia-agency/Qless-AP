'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Always read role from cookie — ensures admin sees full nav even on /kitchen
  const role = Cookies.get('role');

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('role');
    router.push('/login');
  };

  const adminLinks = [
    { href: '/kitchen', label: 'Kitchen Board' },
    { href: '/admin/menu', label: 'Menu' },
    { href: '/admin/orders', label: 'Orders' },
  ];

  const kitchenLinks = [
    { href: '/kitchen', label: 'Kitchen Board' },
  ];

  const links = role === 'admin' ? adminLinks : kitchenLinks;

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-0">
        {/* Logo + Links */}
        <div className="flex items-center gap-1">
          <Link href="/kitchen" className="mr-4 flex items-center gap-2 py-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-black text-black">
              Q
            </span>
            <span className="text-base font-bold tracking-tight text-white">Qless</span>
          </Link>

          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center px-3 py-4 text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-300 sm:block">
            {role ?? 'staff'}
          </span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
