'use client';

interface ClickToCallProps {
  phoneNumber: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ClickToCall({ phoneNumber, className = '', children }: ClickToCallProps) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    }
    if (cleaned.length === 10) {
      return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`;
    }
    return phone;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const number = cleanNumber.startsWith('7') ? cleanNumber : '7' + cleanNumber;
    
    // Dispatch event to open WebRTC phone widget with pre-filled number
    window.dispatchEvent(new CustomEvent('phone-call', { 
      detail: { number } 
    }));
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:underline transition-colors ${className}`}
      title="Позвонить через WebRTC"
    >
      {children || (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {formatPhone(phoneNumber)}
        </>
      )}
    </button>
  );
}
