import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Check,
  Send,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import type { ReminderSettings } from '../types';
import {
  DAYS_OF_WEEK,
  PRESET_REMINDER_PROMPTS,
  getNotificationPermission,
  requestNotificationPermission,
  sendNativeNotification,
  playGentleReminderChime,
  formatReminderTime,
  type NotificationPermissionState,
} from '../lib/reminderManager';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReminderSettings;
  onSaveSettings: (newSettings: ReminderSettings) => Promise<void>;
  onTestReminder?: (prompt: string) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestReminder,
}) => {
  const [localSettings, setLocalSettings] = useState<ReminderSettings>(settings);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('default');
  const [isSaving, setIsSaving] = useState(false);
  const [testSentNotice, setTestSentNotice] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setPermissionState(getNotificationPermission());
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionState(res);
    if (res === 'granted') {
      setLocalSettings((prev) => ({ ...prev, enabled: true }));
    }
  };

  const handleToggleEnable = async () => {
    if (!localSettings.enabled && permissionState !== 'granted') {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res === 'granted' || res === 'unsupported') {
        setLocalSettings((prev) => ({ ...prev, enabled: true }));
      }
    } else {
      setLocalSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
    }
  };

  const handlePresetFrequency = (type: 'daily' | 'weekdays' | 'weekends') => {
    if (type === 'daily') {
      setLocalSettings((prev) => ({ ...prev, days: [0, 1, 2, 3, 4, 5, 6] }));
    } else if (type === 'weekdays') {
      setLocalSettings((prev) => ({ ...prev, days: [1, 2, 3, 4, 5] }));
    } else if (type === 'weekends') {
      setLocalSettings((prev) => ({ ...prev, days: [0, 6] }));
    }
  };

  const handleToggleDay = (dayId: number) => {
    setLocalSettings((prev) => {
      const exists = prev.days.includes(dayId);
      const updatedDays = exists
        ? prev.days.filter((d) => d !== dayId)
        : [...prev.days, dayId].sort((a, b) => a - b);
      return { ...prev, days: updatedDays };
    });
  };

  const handleSendTestNotification = async () => {
    if (permissionState === 'default') {
      const res = await requestNotificationPermission();
      setPermissionState(res);
    }

    if (localSettings.soundEnabled) {
      playGentleReminderChime();
    }
    const testPrompt = localSettings.prompt || 'Time to unpack your day with DearMe 🌿';
    sendNativeNotification('DearMe Test Reminder 🌿', testPrompt);

    if (onTestReminder) {
      onTestReminder(testPrompt);
    }

    setTestSentNotice(true);
    setTimeout(() => setTestSentNotice(false), 4000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(localSettings);
      onClose();
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isDaily = localSettings.days.length === 7;
  const isWeekdays =
    localSettings.days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => localSettings.days.includes(d));
  const isWeekends =
    localSettings.days.length === 2 &&
    [0, 6].every((d) => localSettings.days.includes(d));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FDFCFB] border border-[#E6E1D6] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#F0EDE8] flex items-center justify-between bg-[#FA9F7F]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-[#FDFCFB]" />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-lg text-[#2D2926]">
                Reflection Reminders
              </h2>
              <p className="text-xs text-[#8C857B] font-sans">
                Build a consistent journaling habit with timely nudges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#A8A294] hover:text-[#5A5A40] hover:bg-[#F5F2ED] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#2D2926] font-sans">
          {/* Master Enable/Disable Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F9F8F6] border border-[#E6E1D6]">
            <div>
              <span className="font-semibold text-sm block text-[#2D2926]">
                Enable Reminders
              </span>
              <span className="text-xs text-[#8C857B]">
                {localSettings.enabled
                  ? `Scheduled for ${formatReminderTime(localSettings.time)}`
                  : 'Reminders are currently paused'}
              </span>
            </div>

            <button
              onClick={handleToggleEnable}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                localSettings.enabled ? 'bg-[#5A5A40]' : 'bg-[#D4C9B0]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  localSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Browser Notification Status Banner */}
          {permissionState !== 'granted' && permissionState !== 'unsupported' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Enable desktop push notifications for background alerts</span>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1 bg-amber-800 text-white rounded-lg text-xs font-semibold hover:bg-amber-900 transition-colors cursor-pointer shrink-0"
              >
                Allow
              </button>
            </div>
          )}

          {permissionState === 'granted' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Browser push notifications allowed</span>
            </div>
          )}

          {/* Time Picker */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C564E] flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Reminder Time</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={localSettings.time}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, time: e.target.value }))
                }
                disabled={!localSettings.enabled}
                className="px-4 py-2.5 rounded-xl border border-[#E6E1D6] bg-white text-[#2D2926] font-semibold text-base focus:outline-hidden focus:border-[#5A5A40] disabled:opacity-50 disabled:bg-gray-50 cursor-pointer shadow-2xs"
              />
              <span className="text-xs text-[#8C857B]">
                ({formatReminderTime(localSettings.time)})
              </span>
            </div>
          </div>

          {/* Frequency & Days Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C564E] flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Frequency</span>
            </label>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => handlePresetFrequency('daily')}
                disabled={!localSettings.enabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isDaily
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'bg-[#F5F2ED] text-[#5C564E] hover:bg-[#EAE5DC]'
                } disabled:opacity-50`}
              >
                Everyday
              </button>
              <button
                type="button"
                onClick={() => handlePresetFrequency('weekdays')}
                disabled={!localSettings.enabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isWeekdays
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'bg-[#F5F2ED] text-[#5C564E] hover:bg-[#EAE5DC]'
                } disabled:opacity-50`}
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={() => handlePresetFrequency('weekends')}
                disabled={!localSettings.enabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isWeekends
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'bg-[#F5F2ED] text-[#5C564E] hover:bg-[#EAE5DC]'
                } disabled:opacity-50`}
              >
                Weekends
              </button>
            </div>

            {/* Individual Days Pills */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = localSettings.days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleToggleDay(day.id)}
                    disabled={!localSettings.enabled}
                    title={day.label}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5A5A40] text-white shadow-xs'
                        : 'bg-[#F9F8F6] border border-[#E6E1D6] text-[#A8A294] hover:border-[#5A5A40] hover:text-[#5A5A40]'
                    } disabled:opacity-40`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt Input & Chips */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C564E] flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Reminder Reflection Prompt</span>
            </label>
            <input
              type="text"
              value={localSettings.prompt}
              onChange={(e) =>
                setLocalSettings((prev) => ({ ...prev, prompt: e.target.value }))
              }
              disabled={!localSettings.enabled}
              placeholder="Enter your reflection prompt..."
              maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E6E1D6] bg-white text-xs text-[#2D2926] focus:outline-hidden focus:border-[#5A5A40] disabled:opacity-50 shadow-2xs mb-2.5"
            />

            <div className="flex flex-wrap gap-1.5">
              {PRESET_REMINDER_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setLocalSettings((prev) => ({ ...prev, prompt: preset }))
                  }
                  disabled={!localSettings.enabled}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F2ED] hover:bg-[#EAE5DC] text-[11px] text-[#5C564E] border border-[#E6E1D6] transition-colors cursor-pointer text-left truncate max-w-full disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Test Option */}
          <div className="pt-2 border-t border-[#F0EDE8] flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setLocalSettings((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }))
              }
              disabled={!localSettings.enabled}
              className="flex items-center gap-2 text-xs text-[#5C564E] hover:text-[#2D2926] transition-colors cursor-pointer disabled:opacity-50"
            >
              {localSettings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#5A5A40]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#A8A294]" />
              )}
              <span>
                {localSettings.soundEnabled
                  ? 'Gentle audio chime active'
                  : 'Silent notification'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSendTestNotification}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E1D6] text-xs text-[#5A5A40] hover:bg-[#F9F8F6] font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Notification</span>
            </button>
          </div>

          {testSentNotice && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Test notification dispatched! Check your desktop notifications.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#F0EDE8] bg-[#FAF9F6] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C857B] hover:text-[#2D2926] hover:bg-[#EAE5DC] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5A5A40] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#4A4A34] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Reminder Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
