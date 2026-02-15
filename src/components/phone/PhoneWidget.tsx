'use client';

import { useState, useEffect } from 'react';

export default function PhoneWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayNumber, setDisplayNumber] = useState('');
  const [lastCallNumber, setLastCallNumber] = useState('');
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 1) return `+${cleaned}`;
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  };

  const addDigit = (digit: string) => {
    if (phoneNumber.length < 11) {
      const newNumber = phoneNumber + digit;
      setPhoneNumber(newNumber);
      setDisplayNumber(formatPhoneDisplay(newNumber));
    }
  };

  const removeDigit = () => {
    const newNumber = phoneNumber.slice(0, -1);
    setPhoneNumber(newNumber);
    setDisplayNumber(formatPhoneDisplay(newNumber));
  };

  const clearNumber = () => {
    setPhoneNumber('');
    setDisplayNumber('');
    setCallStatus(null);
  };

  const makeCall = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) return;
    
    const telNumber = cleanNumber.startsWith('7') ? cleanNumber : '7' + cleanNumber;
    setLastCallNumber(telNumber);
    setCallStatus('Вызов через софтфон...');
    
    // Открываем tel: ссылку — софтфон (Zoiper/MicroSIP) подхватит звонок
    window.location.href = `tel:+${telNumber}`;
    
    setTimeout(() => setCallStatus(null), 3000);
  };

  // Слушаем события клика по номерам (legacy support)
  useEffect(() => {
    const handleOpenWidget = (event: CustomEvent<{ phoneNumber: string }>) => {
      const num = event.detail.phoneNumber.replace(/\D/g, '');
      setPhoneNumber(num);
      setDisplayNumber(formatPhoneDisplay(num));
      setIsOpen(true);
    };

    const handlePhoneCall = (event: CustomEvent<{ phoneNumber: string }>) => {
      const num = event.detail.phoneNumber.replace(/\D/g, '');
      // Сразу звоним через tel:
      const telNumber = num.startsWith('7') ? num : '7' + num;
      window.location.href = `tel:+${telNumber}`;
    };

    window.addEventListener('open-phone-widget', handleOpenWidget as EventListener);
    window.addEventListener('phone-call', handlePhoneCall as EventListener);
    
    return () => {
      window.removeEventListener('open-phone-widget', handleOpenWidget as EventListener);
      window.removeEventListener('phone-call', handlePhoneCall as EventListener);
    };
  }, []);

  return (
    <>
      {/* Плавающая кнопка телефона */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)' }}
        title="Открыть номеронабиратель"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>

      {/* Виджет набора номера */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        >
          {/* Заголовок */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4">
            <div className="flex items-center justify-between text-white mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                <span className="text-xs font-medium">Готов к звонкам</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-xl font-light text-white tracking-wide text-center min-h-[28px]">
              {displayNumber || '+7 (___) ___-__-__'}
            </div>
          </div>

          {/* Статус звонка */}
          {callStatus && (
            <div className="px-4 py-2 bg-green-50 text-green-700 text-xs text-center font-medium">
              {callStatus}
            </div>
          )}

          {/* Тело */}
          <div className="p-3">
            {/* Клавиатура */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => addDigit(digit)}
                  className="h-12 text-lg font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-all"
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Кнопки управления */}
            <div className="flex justify-center items-center gap-4">
              <button 
                onClick={removeDigit} 
                className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full"
                title="Удалить"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>

              <button
                onClick={makeCall}
                disabled={phoneNumber.length < 10}
                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${
                  phoneNumber.length >= 10
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Позвонить"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>

              <button 
                onClick={clearNumber} 
                className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full"
                title="Очистить"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Последний звонок */}
            {lastCallNumber && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setPhoneNumber(lastCallNumber);
                    setDisplayNumber(formatPhoneDisplay(lastCallNumber));
                  }}
                  className="w-full text-xs text-gray-400 hover:text-green-600 transition-colors text-center"
                >
                  Повторить: {formatPhoneDisplay(lastCallNumber)}
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-gray-50 border-t text-center">
            <span className="text-[10px] text-gray-400">Звонки через Zoiper / MicroSIP</span>
          </div>
        </div>
      )}
    </>
  );
}
