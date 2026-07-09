'use client';

import DashboardLayout from '@/components/dashboard/layout';
import HelpContent from '@/components/help/help-content';

/**
 * @fileOverview Halaman Bantuan Publik.
 * Memungkinkan akses ke dokumentasi panduan sistem tanpa perlu login.
 */
export default function PublicHelpPage() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-1 py-4 sm:py-8">
        <HelpContent />
      </div>
    </DashboardLayout>
  );
}
