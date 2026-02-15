'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'in-call' | 'on-hold' | 'ended';

interface WebRTCPhoneProps {
  sipServer: string;
  sipWssPort: string;
  sipLogin: string;
  sipPassword: string;
  displayName: string;
}

export default function WebRTCPhone({
  sipServer,
  sipWssPort,
  sipLogin,
  sipPassword,
  displayName,
}: WebRTCPhoneProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [employeeName, setEmployeeName] = useState('');

  const softphoneRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  // Load UIS Softphone
  useEffect(() => {
    let mounted = true;

    async function initSoftphone() {
      try {
        // Получаем WebRTC токен из env
        const token = (window as any).__UIS_WEBRTC_TOKEN || 
                      process.env.NEXT_PUBLIC_UIS_WEBRTC_TOKEN;
        
        if (!token) {
          console.log('[Softphone] No WebRTC token, falling back to JsSIP');
          initJsSIP();
          return;
        }

        const SoftphoneModule = await import('@novosystem/softphone-core');
        const Softphone = SoftphoneModule.default || SoftphoneModule;

        if (!mounted) return;

        // Включаем режим отладки для диагностики
        Softphone.debug();
        
        console.log('[Softphone] Creating with token...');
        const softphone = Softphone.create({
          token,
          shouldPlayCallEndingSignal: true,
        });

        // Обработчики событий
        softphone.on('enabled', () => {
          console.log('[Softphone] Ready');
          if (mounted) {
            setIsRegistered(true);
            setIsRegistering(false);
            toast.success('Телефон подключен');
          }
        });

        softphone.on('error', (mnemonic: string) => {
          console.error('[Softphone] Error:', mnemonic);
          if (mounted) {
            if (mnemonic === 'registrationFailed') {
              setIsRegistered(false);
              setIsRegistering(false);
              toast.error('Ошибка регистрации SIP');
            } else if (mnemonic === 'microphoneAccessDenied') {
              toast.error('Разрешите доступ к микрофону');
            } else if (mnemonic === 'authorzationFailed' || mnemonic === 'invalidToken') {
              setIsRegistered(false);
              toast.error('Неверный WebRTC токен');
            } else {
              toast.error(`Ошибка: ${mnemonic}`);
            }
          }
        });

        softphone.on('sending', (session: any) => {
          console.log('[Softphone] Calling:', session.phoneNumber);
          if (mounted) {
            setCallStatus('connecting');
            setCallerInfo(session.phoneNumber);
          }
        });

        softphone.on('progress', (session: any) => {
          console.log('[Softphone] Ringing:', session.phoneNumber);
          if (mounted) {
            setCallStatus('ringing');
          }
        });

        softphone.on('confirmed', (session: any) => {
          console.log('[Softphone] In call:', session.phoneNumber);
          if (mounted) {
            setCallStatus('in-call');
            setIncomingCall(false);
            startCallTimer();
          }
        });

        softphone.on('ended', (session: any) => {
          console.log('[Softphone] Call ended');
          if (mounted) {
            setCallStatus('idle');
            setIncomingCall(false);
            stopCallTimer();
          }
        });

        softphone.on('failed', (session: any) => {
          console.log('[Softphone] Call failed:', JSON.stringify(session, null, 2));
          if (mounted) {
            setCallStatus('idle');
            setIncomingCall(false);
            stopCallTimer();
            // Показываем более детальную информацию
            const reason = session?.cause || session?.message || 'неизвестная причина';
            toast.error(`Звонок не удался: ${reason}`);
          }
        });

        softphone.on('hold', () => {
          if (mounted) setCallStatus('on-hold');
        });

        softphone.on('unhold', () => {
          if (mounted) setCallStatus('in-call');
        });

        softphone.on('disconnected', () => {
          console.log('[Softphone] Disconnected');
          if (mounted) {
            setIsRegistered(false);
            toast.error('Соединение потеряно');
          }
        });

        softphone.on('destroyed', () => {
          if (mounted) {
            setIsRegistered(false);
          }
        });

        // Следим за входящими звонками через state
        softphone.onStateChange((state: any) => {
          if (state.direction === 'incoming' && state.state === 'sending' && mounted) {
            setIncomingCall(true);
            setCallerInfo(state.phoneNumber || 'Неизвестный');
            setCallStatus('ringing');
            setIsOpen(true);
            setIsMinimized(false);
            toast.info(`Входящий: ${state.phoneNumber}`);
          }
          if (state.employee?.name && mounted) {
            setEmployeeName(state.employee.name);
          }
        });

        softphoneRef.current = softphone;
        setIsRegistering(true);

      } catch (err: any) {
        console.error('[Softphone] Init error:', err);
        if (mounted) {
          // Fallback to JsSIP
          initJsSIP();
        }
      }
    }

    async function initJsSIP() {
      try {
        const mod = await import('jssip');
        const JsSIP = mod.default || mod;
        console.log('[WebRTC] JsSIP loaded (fallback)');
        
        if (!mounted || !sipServer || !sipLogin) return;

        const socket = new JsSIP.WebSocketInterface(`wss://${sipServer}:${sipWssPort}/ws`);
        const config = {
          sockets: [socket],
          uri: `sip:${sipLogin}@${sipServer}`,
          password: sipPassword,
          display_name: displayName,
          register: true,
          session_timers: false,
        };

        const ua = new JsSIP.UA(config);

        ua.on('registered', () => {
          if (mounted) {
            setIsRegistered(true);
            setIsRegistering(false);
            toast.success('Телефон подключен (SIP)');
          }
        });

        ua.on('unregistered', () => {
          if (mounted) { setIsRegistered(false); setIsRegistering(false); }
        });

        ua.on('registrationFailed', (e: any) => {
          if (mounted) {
            setIsRegistered(false);
            setIsRegistering(false);
            toast.error(`Ошибка SIP: ${e.cause}`);
          }
        });

        ua.on('newRTCSession', (data: any) => {
          const session = data.session;
          if (session.direction === 'incoming' && mounted) {
            const caller = session.remote_identity?.display_name || session.remote_identity?.uri?.user || 'Неизвестный';
            setIncomingCall(true);
            setCallerInfo(caller);
            setCallStatus('ringing');
            setIsOpen(true);
            setIsMinimized(false);

            // Store session for answer/reject
            (softphoneRef.current as any) = {
              _jssipSession: session,
              _jssipUA: ua,
              _isJsSIP: true,
            };

            session.on('ended', () => { if (mounted) { setCallStatus('idle'); setIncomingCall(false); stopCallTimer(); }});
            session.on('failed', () => { if (mounted) { setCallStatus('idle'); setIncomingCall(false); stopCallTimer(); }});
          }
        });

        ua.start();
        softphoneRef.current = { _jssipUA: ua, _isJsSIP: true };
        setIsRegistering(true);
      } catch (err: any) {
        console.error('[WebRTC] JsSIP error:', err);
      }
    }

    initSoftphone();

    return () => {
      mounted = false;
      if (softphoneRef.current) {
        try {
          if (softphoneRef.current._isJsSIP) {
            softphoneRef.current._jssipUA?.stop();
          } else {
            softphoneRef.current.destroy();
          }
        } catch(e) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Listen for phone-call events
  useEffect(() => {
    const handlePhoneCall = (e: CustomEvent) => {
      const number = e.detail?.number;
      if (number) {
        setPhoneNumber(number);
        setIsOpen(true);
        setIsMinimized(false);
        // Auto-call if registered
        if (isRegistered && softphoneRef.current) {
          makeCall(number);
        }
      }
    };

    const handleOpenWidget = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener('phone-call', handlePhoneCall as EventListener);
    window.addEventListener('open-phone-widget', handleOpenWidget);

    return () => {
      window.removeEventListener('phone-call', handlePhoneCall as EventListener);
      window.removeEventListener('open-phone-widget', handleOpenWidget);
    };
  }, [isRegistered]);

  const makeCall = useCallback((number: string) => {
    if (!softphoneRef.current || !isRegistered) {
      toast.error('Телефон не подключен');
      return;
    }

    // Убираем всё кроме цифр
    let cleanNumber = number.replace(/\D/g, '');
    console.log('[Phone] Raw number:', number, '-> Clean:', cleanNumber, 'Length:', cleanNumber.length);
    
    if (cleanNumber.length < 10) {
      toast.error('Некорректный номер');
      return;
    }
    
    // Нормализация номера для UIS
    // UIS требует формат с 8 в начале (как при обычном наборе с телефона)
    
    // Если 12 цифр и начинается с 78 или 87 — убираем лишнее
    if (cleanNumber.length === 12 && cleanNumber.startsWith('78')) {
      cleanNumber = cleanNumber.substring(1); // убираем 7, оставляем 8...
      console.log('[Phone] Removed leading 7, now:', cleanNumber);
    }
    
    // Если 11 цифр и начинается с 7 — заменяем 7 на 8 (формат UIS)
    if (cleanNumber.length === 11 && cleanNumber.startsWith('7')) {
      cleanNumber = '8' + cleanNumber.substring(1);
      console.log('[Phone] Replaced 7 with 8 for UIS format, now:', cleanNumber);
    }
    
    // Если 10 цифр — добавляем 8 в начало
    if (cleanNumber.length === 10) {
      cleanNumber = '8' + cleanNumber;
      console.log('[Phone] Added 8 prefix, now:', cleanNumber);
    }
    
    // Если 11 цифр и начинается с 8 — оставляем как есть
    if (cleanNumber.length === 11 && cleanNumber.startsWith('8')) {
      console.log('[Phone] Already in 8xxx format:', cleanNumber);
    }

    // Пробуем разные форматы для UIS Softphone
    // UIS может требовать формат с + или без
    const dialNumber = cleanNumber; // Пока без +, можно попробовать '+' + cleanNumber
    
    console.log('[Phone] Final number to call:', dialNumber);
    setCallStatus('connecting');
    setPhoneNumber(cleanNumber);

    try {
      if (softphoneRef.current._isJsSIP) {
        // JsSIP fallback — use Call API
        fetch('/api/calls/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientPhone: cleanNumber }),
        }).then(r => r.json()).then(result => {
          if (!result.success) {
            setCallStatus('idle');
            toast.error(`Ошибка: ${result.error}`);
          } else {
            toast.info('Соединяем...');
          }
        });
      } else {
        // UIS Softphone — прямой звонок!
        // Пробуем формат как при обычном наборе: без +
        console.log('[Softphone] Dialing:', dialNumber);
        softphoneRef.current.call(dialNumber);
      }
    } catch (err: any) {
      console.error('[Phone] Call error:', err);
      setCallStatus('idle');
      toast.error(`Ошибка: ${err.message}`);
    }
  }, [isRegistered, toast]);

  const answerCall = useCallback(() => {
    if (!softphoneRef.current) return;
    try {
      if (softphoneRef.current._isJsSIP && softphoneRef.current._jssipSession) {
        softphoneRef.current._jssipSession.answer({ mediaConstraints: { audio: true, video: false } });
        setCallStatus('in-call');
        setIncomingCall(false);
        startCallTimer();
      } else {
        softphoneRef.current.answer();
      }
    } catch(e) {}
  }, []);

  const rejectCall = useCallback(() => {
    if (!softphoneRef.current) return;
    try {
      if (softphoneRef.current._isJsSIP && softphoneRef.current._jssipSession) {
        softphoneRef.current._jssipSession.terminate();
      } else {
        softphoneRef.current.terminate();
      }
    } catch(e) {}
    setIncomingCall(false);
    setCallStatus('idle');
  }, []);

  const hangup = useCallback(() => {
    if (!softphoneRef.current) return;
    try {
      if (softphoneRef.current._isJsSIP && softphoneRef.current._jssipSession) {
        softphoneRef.current._jssipSession.terminate();
      } else {
        softphoneRef.current.terminate();
      }
    } catch(e) {}
    setCallStatus('idle');
    stopCallTimer();
  }, []);

  const toggleMute = useCallback(() => {
    if (!softphoneRef.current) return;
    try {
      if (softphoneRef.current._isJsSIP) return;
      if (isMuted) softphoneRef.current.unmute();
      else softphoneRef.current.mute();
      setIsMuted(!isMuted);
    } catch(e) {}
  }, [isMuted]);

  const toggleHold = useCallback(() => {
    if (!softphoneRef.current) return;
    try {
      if (softphoneRef.current._isJsSIP) return;
      if (callStatus === 'on-hold') softphoneRef.current.unhold();
      else softphoneRef.current.hold();
    } catch(e) {}
  }, [callStatus]);

  function startCallTimer() {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
  }

  function stopCallTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallDuration(0);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatPhoneDisplay(phone: string): string {
    const c = phone.replace(/\D/g, '');
    if (c.length === 11 && c.startsWith('7')) {
      return `+7 (${c.slice(1, 4)}) ${c.slice(4, 7)}-${c.slice(7, 9)}-${c.slice(9)}`;
    }
    return phone;
  }

  const handleDial = () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length >= 10) makeCall(clean);
  };

  const addDigit = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
    if (softphoneRef.current && !softphoneRef.current._isJsSIP && callStatus === 'in-call') {
      softphoneRef.current.sendDTMF(digit);
    }
  };

  // FAB button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Открыть телефон"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {isRegistered && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-300 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    );
  }

  // Minimized during call
  if (isMinimized && callStatus !== 'idle') {
    return (
      <div onClick={() => setIsMinimized(false)} className="fixed bottom-6 right-6 z-50 bg-green-500 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-green-600 transition-colors">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <span className="font-medium">{formatDuration(callDuration)}</span>
        <span className="text-sm opacity-80">{callerInfo || formatPhoneDisplay(phoneNumber)}</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[320px] bg-white rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isRegistered ? 'bg-green-500' : 'bg-gray-800'} text-white`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isRegistered ? 'bg-green-300 animate-pulse' : isRegistering ? 'bg-yellow-300 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm font-medium">
            {isRegistered ? (employeeName || 'Подключен') : isRegistering ? 'Подключение...' : 'Отключен'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {callStatus !== 'idle' && (
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Incoming call */}
      {callStatus === 'ringing' && incomingCall && (
        <div className="p-6 text-center">
          <div className="text-lg font-bold text-gray-900 mb-1">Входящий звонок</div>
          <div className="text-gray-500 mb-6">{callerInfo}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={answerCall} className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button onClick={rejectCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
              <svg className="w-7 h-7 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* In call */}
      {(callStatus === 'in-call' || callStatus === 'on-hold' || callStatus === 'connecting') && !incomingCall && (
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-gray-900">{formatPhoneDisplay(phoneNumber)}</div>
            <div className={`text-sm font-medium ${callStatus === 'connecting' ? 'text-yellow-500' : callStatus === 'on-hold' ? 'text-orange-500' : 'text-green-500'}`}>
              {callStatus === 'connecting' ? 'Соединение...' : callStatus === 'on-hold' ? 'На удержании' : formatDuration(callDuration)}
            </div>
          </div>
          <div className="flex justify-center gap-3 mb-4">
            <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button onClick={toggleHold} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${callStatus === 'on-hold' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button onClick={hangup} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Завершить
          </button>
        </div>
      )}

      {/* Dialer */}
      {isRegistered && callStatus === 'idle' && !incomingCall && (
        <div className="p-4">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            className="w-full text-center text-xl font-medium py-3 border-b-2 border-gray-200 focus:border-green-500 outline-none mb-3"
            onKeyDown={(e) => e.key === 'Enter' && handleDial()}
          />
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit) => (
              <button key={digit} onClick={() => addDigit(digit)} className="h-12 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-lg font-medium text-gray-700 transition-colors">
                {digit}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleDial} disabled={phoneNumber.replace(/\D/g, '').length < 10} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium disabled:opacity-30 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Позвонить
            </button>
          </div>
        </div>
      )}

      {/* Not registered */}
      {!isRegistered && !isRegistering && callStatus === 'idle' && (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Телефон не подключен</p>
          <p className="text-xs text-gray-400">Ожидание WebRTC токена...</p>
        </div>
      )}

      {isRegistering && callStatus === 'idle' && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Подключение...</p>
        </div>
      )}
    </div>
  );
}
