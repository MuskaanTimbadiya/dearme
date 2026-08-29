import React, { useState } from 'react';
import { Sparkles, Shield, Lock, Compass, ArrowRight, Brain, Feather, Eye } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { sanitizeUserFacingError } from '../lib/errorUtils';
import { PrivacyTermsModal } from './PrivacyTermsModal';

interface LandingPageProps {
  onSignInSuccess: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const user = await signInWithGoogle();
      if (user) {
        onSignInSuccess();
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // Normal user cancellation - do not treat as an error
        return;
      }
      setErrorMessage(
        sanitizeUserFacingError(err, 'Failed to authenticate. Please check your network connection and try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#2D2926] flex flex-col justify-between selection:bg-[#EDE8DF]">
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
            <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-[#E6E1D6]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#5A5A40] tracking-tight">DearMe</h1>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#A8A294] font-sans">Mindful Intelligence</p>
          </div>
        </div>

        <button
          id="btn-nav-signin"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs font-sans uppercase tracking-wider font-semibold bg-[#5A5A40] text-white hover:bg-[#4A4A34] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign In <span className="hidden sm:inline">with Google</span></span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5F2ED] border border-[#E6E1D6] text-[10px] sm:text-[11px] font-sans uppercase tracking-widest text-[#5A5A40] mb-6">
          <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>User-Isolated Firestore & Gemini-Powered Intelligence</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal text-[#2D2926] tracking-tight leading-[1.18] mb-6 max-w-3xl">
          Deepen your daily reflections with an organic, mindful AI companion.
        </h2>

        <p className="text-sm sm:text-lg text-[#5C564E] max-w-2xl mb-8 leading-relaxed font-serif italic">
          "Growth often begins by holding space for what is, before reaching for what could be."
        </p>

        {errorMessage && (
          <div className="w-full max-w-md p-4 mb-6 rounded-2xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#9B2C2C] text-left">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
          <button
            id="btn-hero-start"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full text-xs sm:text-sm font-sans uppercase tracking-wider font-semibold bg-[#5A5A40] text-white hover:bg-[#4A4A34] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Begin Your Reflection</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Product Preview Mockup Frame */}
        <div className="w-full max-w-4xl rounded-3xl overflow-hidden border border-[#E6E1D6] shadow-xl bg-white p-2 sm:p-4 mb-16 animate-in fade-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0EDE8] mb-3 text-xs text-[#A8A294] font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="ml-2 font-medium text-[#5A5A40]">DearMe Workspace Preview</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#5A5A40] font-semibold">
              <Eye className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Interactive Reflection UI</span>
            </div>
          </div>
          <img
            src="/product_preview.jpg"
            alt="DearMe Reflection Journal Interface Preview"
            className="w-full h-auto max-h-[500px] object-cover rounded-2xl"
          />
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 sm:p-7 rounded-[28px] bg-[#F5F2ED] border border-[#E6E1D6] shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-[#2D2926] mb-2">Isolated Privacy</h3>
            <p className="text-xs sm:text-sm text-[#5C564E] leading-relaxed">
              Every journal entry is cryptographically anchored to your Firebase UID. Firestore security rules prevent any cross-user data access.
            </p>
          </div>

          <div className="p-6 sm:p-7 rounded-[28px] bg-[#F5F2ED] border border-[#E6E1D6] shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-[#2D2926] mb-2">Multi-Turn Reflection</h3>
            <p className="text-xs sm:text-sm text-[#5C564E] leading-relaxed">
              Converse fluidly across multiple turns with Gemini to unpack emotions, explore brainstorm angles, or discover action steps.
            </p>
          </div>

          <div className="p-6 sm:p-7 rounded-[28px] bg-[#F5F2ED] border border-[#E6E1D6] shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-[#2D2926] mb-2">AI Summaries & Moods</h3>
            <p className="text-xs sm:text-sm text-[#5C564E] leading-relaxed">
              Extract executive takeaways, key emotional themes, and descriptive titles automatically to track personal growth over time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t border-[#F0EDE8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#A8A294] font-sans uppercase tracking-widest gap-4">
        <div>DearMe • Natural Mindful Space</div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]">
          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="hover:text-[#5A5A40] transition-colors underline decoration-dotted underline-offset-4 cursor-pointer"
          >
            Privacy Policy & Terms
          </button>
          <span>•</span>
          <span>Firestore Encrypted</span>
          <span>•</span>
          <span>Google OAuth 2.0</span>
        </div>
      </footer>

      <PrivacyTermsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};
