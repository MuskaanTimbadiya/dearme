import React from 'react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#9B2C2C] flex items-center justify-between shadow-sm my-2">
      <span>{message}</span>
      <div className="flex gap-2 shrink-0">
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-3 py-1.5 rounded bg-[#9B2C2C] text-white hover:bg-[#7b2222] transition-colors cursor-pointer font-medium"
          >
            Retry Save
          </button>
        )}
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="px-3 py-1.5 rounded border border-[#F5C6C6] text-[#9B2C2C] hover:bg-[#F5C6C6] transition-colors cursor-pointer font-medium"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
