'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerStyle={{
        top: 20,
      }}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
          fontWeight: '500',
          direction: 'rtl',
        },
        // Specific options by type
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
          style: {
            border: '2px solid #22c55e',
            background: '#f0fdf4',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            border: '2px solid #ef4444',
            background: '#fef2f2',
          },
        },
      }}
    />
  )
}
