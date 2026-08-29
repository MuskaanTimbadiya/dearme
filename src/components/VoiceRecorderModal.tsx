import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, RefreshCw, Volume2, Sparkles, X } from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAudioNote: (audioUrl: string, duration: number, transcript: string) => void;
  onInsertTranscriptOnly: (transcript: string) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveAudioNote,
  onInsertTranscriptOnly,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSpeechRecognitionSupport, setHasSpeechRecognitionSupport] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSpeechRecognitionSupport(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetRecorder();
    }
  }, [isOpen]);

  const resetRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setTranscript('');
    setIsPlayingPreview(false);
    setErrorMessage(null);
    audioChunksRef.current = [];
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setTranscript('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start Recording Timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Initialize Web Speech Recognition if available
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let currentTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech recognition notice:', err.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition not initialized:', e);
        }
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const togglePreviewPlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (audioUrl) {
      onSaveAudioNote(audioUrl, recordingTime, transcript);
      onClose();
    } else if (transcript) {
      onInsertTranscriptOnly(transcript);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#FDFCFB] border border-[#E6E1D6] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-5 text-[#2D2926]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-[#5A5A40]">Voice Reflection Note</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#A8A294] hover:text-[#5A5A40] hover:bg-[#F5F2ED] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F5C6C6] text-[#9B2C2C] text-xs rounded-xl font-sans">
            {errorMessage}
          </div>
        )}

        {/* Recording Visualizer Container */}
        <div className="flex flex-col items-center justify-center py-6 bg-[#F5F2ED] rounded-2xl border border-[#E6E1D6] relative overflow-hidden">
          {/* Animated Waveform Bars */}
          {isRecording ? (
            <div className="flex items-center gap-1.5 h-12 mb-3">
              <div className="w-1.5 bg-[#5A5A40] rounded-full animate-audio-bar" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 bg-[#5A5A40] rounded-full animate-audio-bar" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 bg-[#5A5A40] rounded-full animate-audio-bar" style={{ animationDelay: '0.4s' }} />
              <div className="w-1.5 bg-[#5A5A40] rounded-full animate-audio-bar" style={{ animationDelay: '0.1s' }} />
              <div className="w-1.5 bg-[#5A5A40] rounded-full animate-audio-bar" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : (
            <Volume2 className="w-10 h-10 text-[#A8A294] mb-3" />
          )}

          {/* Time Display */}
          <div className="text-2xl font-mono font-semibold text-[#5A5A40] tracking-wider mb-2">
            {formatTime(recordingTime)}
          </div>

          {/* Record Control Button */}
          {!audioUrl ? (
            isRecording ? (
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#9B2C2C] text-white text-xs font-sans uppercase tracking-wider font-semibold hover:bg-[#7D2323] transition-all cursor-pointer shadow-md"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Recording</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5A5A40] text-white text-xs font-sans uppercase tracking-wider font-semibold hover:bg-[#4A4A34] transition-all cursor-pointer shadow-md"
              >
                <Mic className="w-4 h-4" />
                <span>Start Recording</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={togglePreviewPlayback}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5A5A40] text-white text-xs font-sans uppercase tracking-wider font-semibold hover:bg-[#4A4A34] transition-all cursor-pointer shadow-xs"
              >
                {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingPreview ? 'Pause' : 'Play Audio'}</span>
              </button>
              <button
                onClick={startRecording}
                className="p-2 rounded-full bg-white text-[#5C564E] border border-[#E6E1D6] hover:bg-[#EDE8DF] transition-colors cursor-pointer"
                title="Re-record"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Live Speech-to-Text Transcription Box */}
        <div className="flex flex-col gap-1.5">
          {!hasSpeechRecognitionSupport && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-sans-body">
              Note: Live speech-to-text is not supported in this browser. Audio recording is fully functional!
            </div>
          )}
          <div className="flex items-center justify-between text-xs font-tech-heading text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Live Speech-To-Text Transcription</span>
            {transcript && <span className="text-[10px] text-[#42b883] font-medium">{transcript.split(' ').length} words</span>}
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isRecording ? 'Listening and transcribing your voice...' : 'Transcribed words will appear here. You can also edit this text manually.'}
            rows={3}
            className="w-full bg-[#FDFCFB] border border-[#E6E1D6] rounded-xl p-3 text-xs text-[#2D2926] placeholder-[#A8A294] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0EDE8]">
          <button
            onClick={() => {
              if (transcript) {
                onInsertTranscriptOnly(transcript);
                onClose();
              }
            }}
            disabled={!transcript.trim()}
            className="text-xs font-sans text-[#5A5A40] hover:underline disabled:opacity-40 cursor-pointer"
          >
            Insert Text Only
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-sans font-medium text-[#5C564E] hover:bg-[#F5F2ED] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!audioUrl && !transcript.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#5A5A40] text-white text-xs font-sans font-semibold uppercase tracking-wider hover:bg-[#4A4A34] disabled:opacity-40 cursor-pointer shadow-xs transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attach Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
