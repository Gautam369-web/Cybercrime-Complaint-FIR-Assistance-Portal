'use client';

import dynamic from 'next/dynamic';

const PortalRoot = dynamic(() => import('../src/PortalRoot'), {
  ssr: false,
  loading: () => <div className="twilight-placeholder" aria-hidden="true" />,
});

const LensEffects = dynamic(() => import('../src/LensEffects'), { ssr: false });

export default function PortalShell() {
  return (
    <>
      <LensEffects />
      <PortalRoot />
    </>
  );
}
