'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const TwilightBackground = dynamic(() => import('../../../src/TwilightBackground'), { ssr: false });

function WallpaperRender() {
  const params = useSearchParams();
  const theme = params.get('theme') || 'obsidian';
  return <TwilightBackground renderTheme={theme} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WallpaperRender />
    </Suspense>
  );
}
