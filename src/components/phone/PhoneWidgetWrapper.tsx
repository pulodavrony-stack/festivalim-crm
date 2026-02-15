'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Динамический импорт WebRTC Phone (client-side only)
const WebRTCPhone = dynamic(() => import('./WebRTCPhone'), { 
  ssr: false,
  loading: () => null 
});

export default function PhoneWidgetWrapper() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const isLoginPage = pathname === '/login';
    setIsAuthenticated(!isLoginPage);
  }, [pathname]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WebRTCPhone
      sipServer={process.env.NEXT_PUBLIC_SIP_SERVER || 'pbx.uiscom.ru'}
      sipWssPort={process.env.NEXT_PUBLIC_SIP_WSS_PORT || '443'}
      sipLogin={process.env.NEXT_PUBLIC_SIP_LOGIN || ''}
      sipPassword={process.env.NEXT_PUBLIC_SIP_PASSWORD || ''}
      displayName={process.env.NEXT_PUBLIC_SIP_DISPLAY_NAME || 'CRM'}
    />
  );
}
