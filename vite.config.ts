import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'app-logo.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Smart Dialer & Caller ID',
          short_name: 'SmartDialer',
          description:
            'একটি আধুনিক কলার আইডি, ডায়ালার, সিম কন্টাক্ট, গুগল মেসেজ ও অফলাইন এসএমএস সুবিধা সমৃদ্ধ অ্যান্ড্রয়েড টেলিকম ও মেসেজিং অ্যাপ।',
          theme_color: '#059669',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['utilities', 'productivity', 'communication'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
          shortcuts: [
            {
              name: 'ডায়ালপ্যাড (Dialpad)',
              short_name: 'ডায়াল',
              description: 'দ্রুত ডায়ালপ্যাড খুলুন',
              url: '/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'এসএমএস মেসেজ (Messages)',
              short_name: 'মেসেজ',
              description: 'অফলাইন এসএমএস ইনবক্স খুলুন',
              url: '/?tab=messages',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'কন্টাক্টস (Contacts)',
              short_name: 'কন্টাক্টস',
              description: 'সিম ও ফোনের কন্টাক্ট তালিকা',
              url: '/?tab=contacts',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
          screenshots: [
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Smart Dialer Mobile',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Smart Dialer Tablet',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
