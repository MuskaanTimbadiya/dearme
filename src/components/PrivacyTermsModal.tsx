import React from 'react';
import { X, Shield, Lock, FileText } from 'lucide-react';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white text-[#2D2926] rounded-3xl border border-[#E6E1D6] shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F5F2ED] text-[#8C857B] hover:text-[#2D2926] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[#F0EDE8] pb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-semibold text-[#2D2926]">Privacy Policy & Terms of Service</h2>
            <p className="text-xs text-[#8C857B] font-sans">DearMe Mindful Intelligence • User-Isolated Reflection Security</p>
          </div>
        </div>

        <div className="space-y-4 text-xs font-sans text-[#5C564E] leading-relaxed">
          <div className="bg-[#F9F8F6] p-4 rounded-2xl border border-[#E6E1D6] flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#2D2926] mb-1">User Data Isolation Guarantee</h3>
              <p>
                Your personal journal entries and audio reflections are protected by Firestore security rules bound exclusively to your unique User ID (`request.auth.uid == userId`). No third party or unauthorized user can read or write your reflection data.
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#2D2926] mb-1">1. Information Collection & Usage</h3>
            <p>
              DearMe processes your text entries, photo attachments, and audio notes strictly for generating automated mindfulness reflections, mood trends, and key takeaways using Google Gemini AI. Your personal reflections are never sold or shared with third-party advertisers.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#2D2926] mb-1">2. AI Content Generation & Fallback Safety</h3>
            <p>
              AI responses are generated dynamically using resilient Google Gemini models (`gemini-3.6-flash`). Insights are provided as supportive Socratic guidance and do not constitute formal medical or psychological diagnosis.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#2D2926] mb-1">3. Data Retention & Deletion Rights</h3>
            <p>
              You maintain full control over your journal entries. You can soft-delete or permanently wipe any reflection entry at any time directly from the history sidebar.
            </p>
          </div>
        </div>

        <div className="border-t border-[#F0EDE8] pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#5A5A40] text-white hover:bg-[#4A4A34] text-xs font-sans font-semibold uppercase tracking-wider cursor-pointer shadow-xs"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
