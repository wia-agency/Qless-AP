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
    <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-0">
        {/* Logo + Links */}
        <div className="flex items-center gap-1">
          <Link href="/kitchen" className="mr-4 flex items-center gap-2 py-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-xs font-black text-white">
              Q
            </span>
            <span className="text-base font-bold tracking-tight text-gray-900">Qless</span>
          </Link>

          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center px-3 py-4 text-sm font-medium transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gray-900" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-500 sm:block">
            {role ?? 'staff'}
          </span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
