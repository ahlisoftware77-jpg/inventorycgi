import React from 'react';

export function generateStaticParams() {
  return [];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
