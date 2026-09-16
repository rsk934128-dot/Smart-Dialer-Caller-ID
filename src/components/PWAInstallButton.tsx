import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, ArrowUpRight, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Language } from '../utils/i18n';

interface PWAInstallProps {
  lang: Language;
}

export const PWAInstallButton: React.FC<PWAInstallProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const isBn = lang === 'bn';

  // If already running in standalone mode (already installed), show a small installed status chip
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Header Install Action Button */}
      <button
        id="pwa-install-header-btn"
        onClick={() => {
          if (isInstallable) {
            install();
          } else if (isIOS) {
            setShowIOSGuide(true);
          } else {
            setShowPreviewModal(true);
          }
        }}
        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition transform active:scale-95"
        title={isBn ? 'মোবাইলে অ্যাপ ইনস্টল করুন' : 'Install Smart Dialer App'}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="hidden sm:inline">
          {isBn ? 'ইনস্টল অ্যাপ' : 'Install App'}
        </span>
        <span className="sm:hidden">{isBn ? 'ইনস্টল' : 'Install'}</span>
      </button>

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div
          id="ios-pwa-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/app-logo.png"
                  alt="Smart Dialer"
                  className="w-10 h-10 rounded-2xl shadow-md border border-neutral-200 dark:border-neutral-700 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {isBn ? 'আইফোনে ইনস্টল করার নিয়ম' : 'Install on iPhone / iPad'}
                  </h4>
                  <p className="text-[11px] text-neutral-500">Safari Browser</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  ১
                </div>
                <p>
                  {isBn
                    ? 'সাফারি ব্রাউজারের নিচের দিকে অবস্থিত Share (শেয়ার) আইকনে ট্যাপ করুন।'
                    : 'Tap the Share icon at the bottom of Safari.'}
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  ২
                </div>
                <p>
                  {isBn
                    ? 'মেনু স্ক্রোল করে "Add to Home Screen" (হোম স্ক্রিনে যোগ করুন) অপশন বেছে নিন।'
                    : 'Scroll down and select "Add to Home Screen".'}
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                  ৩
                </div>
                <p>
                  {isBn
                    ? 'উপরে "Add" বাটনে চাপলে হোম স্ক্রিনে স্মার্ট ডায়ালার লোগোসহ অ্যাপ যুক্ত হবে।'
                    : 'Tap "Add" in top right corner. The icon will appear on your Home screen.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition"
            >
              {isBn ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {/* App Logo & Installation Guide Modal for Desktop/Android preview */}
      {showPreviewModal && (
        <div
          id="pwa-preview-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'মোবাইল হোম স্ক্রিন লোগো ও PWA' : 'Mobile Home Screen & PWA Icon'}
                </h4>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* App Icon Visual Display */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center space-y-2.5">
              <div className="relative">
                <img
                  src="/app-logo.png"
                  alt="App Icon"
                  className="w-20 h-20 rounded-3xl shadow-xl border-2 border-emerald-500/50 object-cover transform hover:scale-105 transition"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Smart Dialer & Caller ID
                </h5>
                <p className="text-[11px] text-neutral-500">
                  {isBn ? 'মোবাইল ডিভাইস ও ব্রাউজারে অফিসিয়াল লোগো' : 'Official PWA Mobile Icon'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {isBn ? 'কিভাবে মোবাইলে ইন্সটল করবেন:' : 'How to install on mobile:'}
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                <li>
                  {isBn
                    ? 'অ্যান্ড্রয়েড Chrome-এ ব্রাউজার মেনু (৩ ডট) থেকে "Install app" বা "Add to Home screen" নির্বাচন করুন।'
                    : 'On Android Chrome: Tap menu (3 dots) -> "Install app".'}
                </li>
                <li>
                  {isBn
                    ? 'আইফোনে Safari-এর Share বাটন থেকে "Add to Home Screen" নির্বাচন করুন।'
                    : 'On iPhone Safari: Tap Share -> "Add to Home Screen".'}
                </li>
                <li>
                  {isBn
                    ? 'ব্রাউজার ট্যাবে এবং মোবাইলের হোম স্ক্রিনে এই চমৎকার লোগোটি ভেসে উঠবে।'
                    : 'The official app icon will be visible on your home screen and browser tab.'}
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition shadow-sm"
              >
                {isBn ? 'ঠিক আছে' : 'OK, Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
