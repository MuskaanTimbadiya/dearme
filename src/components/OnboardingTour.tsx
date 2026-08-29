import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, Compass, Palette, Download, CheckCircle } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    title: 'Welcome to DearMe',
    description: 'Your private, AI-guided reflection space. Let us show you a few powerful mindfulness tools to get you started.',
    icon: Sparkles,
    color: 'from-[#35495e] to-[#42b883]',
  },
  {
    title: 'Multi-Turn Reflection Modes',
    description: 'Switch between Socratic Reflection, Creative Brainstorming, Actionable Steps, and Deep Summaries using the mode selector pills.',
    icon: Compass,
    color: 'from-[#42b883] to-emerald-400',
  },
  {
    title: 'AI Synthesis & Key Takeaways',
    description: 'Click "Synthesize Insights" at any time to generate an automated AI summary, mood tags, and core key takeaways from your writing.',
    icon: Sparkles,
    color: 'from-[#35495e] to-indigo-500',
  },
  {
    title: 'Custom Journal Themes & Typography',
    description: 'Personalize your journal experience with classic Garamond, Caveat handwriting, or typewriter fonts alongside translucent parchment paper themes.',
    icon: Palette,
    color: 'from-amber-500 to-rose-400',
  },
  {
    title: 'Export & Streaks',
    description: 'Track your daily reflection streaks in the header and export your reflections anytime as formatted Markdown or printable PDF documents.',
    icon: Download,
    color: 'from-[#42b883] to-[#35495e]',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      localStorage.setItem('dearme_onboarding_completed', 'true');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg glass-panel-dark text-white rounded-3xl border border-white/20 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col gap-6 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center shadow-lg text-white`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-tech-heading uppercase tracking-widest text-[#42b883] font-bold">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <h3 className="text-xl font-tech-heading font-bold text-white leading-tight">
              {step.title}
            </h3>
          </div>
        </div>

        <p className="text-sm font-sans-body text-slate-300 leading-relaxed">
          {step.description}
        </p>

        {/* Step Indicators & Controls */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-[#42b883]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-full btn-vue-primary text-xs font-tech-heading font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>{currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}</span>
            {currentStep === TOUR_STEPS.length - 1 ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
