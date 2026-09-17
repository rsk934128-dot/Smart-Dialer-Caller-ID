import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Phone,
  X,
  Copy,
  Check,
  ShieldAlert,
  CardSim as SimCard,
  ExternalLink,
} from 'lucide-react';
import { SmsMessage } from '../types';
import { smsService } from '../services/smsService';
import { Language } from '../utils/i18n';

interface IncomingSmsBannerProps {
  lang: Language;
  onOpenConversation: (phone: string, name?: string) => void;
  onInitiateCall: (phone: string, name: string) => void;
}

export const IncomingSmsBanner: React.FC<IncomingSmsBannerProps> = ({
  lang,
  onOpenConversation,
  onInitiateCall,
}) => {
  const [activeMessage, setActiveMessage] = useState<SmsMessage | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const isBn = lang === 'bn';

  useEffect(() => {
    const unsubscribe = smsService.onIncomingSms((message) => {
      setActiveMessage(message);
      setCopiedOtp(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto dismiss after 8 seconds
  useEffect(() => {
    if (!activeMessage) return;

    const timer = setTimeout(() => {
      setActiveMessage(null);
    }, 8000);

    return () => clearTimeout(timer);
  }, [activeMessage]);

  const handleCopyOtp = (otp: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const handleReply = () => {
    if (!activeMessage) return;
    const phone = activeMessage.senderPhone;
    const name = activeMessage.senderName;
    setActiveMessage(null);
    onOpenConversation(phone, name);
  };

  const handleCall = () => {
    if (!activeMessage) return;
    const phone = activeMessage.senderPhone;
    const name = activeMessage.senderName || activeMessage.senderPhone;
    setActiveMessage(null);
    onInitiateCall(phone, name);
  };

  return (
    <AnimatePresence>
      {activeMessage && (
        <div className="fixed top-3 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto w-full max-w-md rounded-2xl shadow-xl border overflow-hidden backdrop-blur-md ${
              activeMessage.isSpam
                ? 'bg-rose-900/95 border-rose-700 text-white'
                : 'bg-neutral-900/95 dark:bg-neutral-800/95 border-neutral-700/80 text-white'
            }`}
          >
            {/* Top header row */}
            <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between gap-2 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    activeMessage.isSpam ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  {activeMessage.isSpam ? (
                    <ShieldAlert className="w-4 h-4 text-white" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold truncate">
                      {activeMessage.senderName || activeMessage.senderPhone}
                    </p>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        activeMessage.simSlot === 2
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <SimCard className="w-2.5 h-2.5" />
                      {activeMessage.simSlot === 2 ? 'SIM 2' : 'SIM 1'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      • {isBn ? 'এইমাত্র' : 'Just now'}
                    </span>
                  </div>
                  {activeMessage.senderName && activeMessage.senderName !== activeMessage.senderPhone && (
                    <p className="text-[10px] text-neutral-400 truncate font-mono">
                      {activeMessage.senderPhone}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="px-3.5 py-2 text-xs text-neutral-200 line-clamp-2 leading-relaxed">
              {activeMessage.body}
            </div>

            {/* OTP Code Chip if present */}
            {activeMessage.isOtp && activeMessage.otpCode && (
              <div className="px-3.5 pb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                  <span>{isBn ? 'ওটিপি কোড:' : 'OTP:'}</span>
                  <span className="text-sm tracking-wider text-amber-200">{activeMessage.otpCode}</span>
                </div>

                <button
                  onClick={() => handleCopyOtp(activeMessage.otpCode!)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copiedOtp ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{isBn ? 'কপি হয়েছে' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isBn ? 'কপি ওটিপি' : 'Copy OTP'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Quick Action Footer */}
            <div className="px-3.5 py-2 bg-white/5 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={handleCall}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isBn ? 'কল করুন' : 'Call'}</span>
              </button>

              <button
                onClick={handleReply}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isBn ? 'উত্তর দিন' : 'Open & Reply'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
