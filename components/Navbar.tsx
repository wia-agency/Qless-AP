'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface NavbarProps {
  role?: string;
}

export default function Navbar({ role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('role');
    router.push('/login');
  };

  const links =
    role === 'admin'
      ? [
          { href: '/kitchen', label: 'Kitchen Board' },
          { href: '/admin/menu', label: 'Menu' },
          { href: '/admin/orders', label: 'Order History' },
        ]
      : [{ href: '/kitchen', label: 'Kitchen Board' }];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-gray-900">Qless</span>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
