'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/planner', label: 'Weekly Planner', icon: '📅' },
  { href: '/campaigns', label: 'Campaigns', icon: '📬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-brand-pine min-h-screen flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard">
          <img
            src="/logos/logo-horizontal.png"
            alt="DealFlow OH"
            className="h-10 w-auto brightness-0 invert"
          />
        </Link>
        <p className="text-white/50 text-xs font-body mt-1">SMS Campaign Manager</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 font-body text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-white/15 text-white border-r-3 border-brand-gold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-white font-display font-bold text-sm">
            {session?.user?.name?.[0] || 'U'}
          </div>
          <div>
            <p className="text-white text-sm font-body font-medium">{session?.user?.name || 'User'}</p>
            <p className="text-white/50 text-xs font-body">{(session?.user as any)?.tz_label || ''}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-white/50 hover:text-white text-xs font-body transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
