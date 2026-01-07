'use client';
import React, { useRef, useState } from 'react';
import { api } from '@/app/lib/apiClient';

const DubbingPage: React.FC = () => {
  // --- STATE CHO WHISPER TOOL ---
  const [inputPath, setInputPath] = useState('D:\\Dubbing\\pmh_vocals.wav');

  // --- STATE CHO MAKE AUDIO TOOL ---
  const [makeAudioPath, setMakeAudioPath] = useState('D:\\Dubbing\\pmh_vi.srt');

  // --- STATE CHO MERGE VIDEO TOOL (MỚI) ---
  const [mixVideoPath, setMixVideoPath] = useState('D:\\Dubbing\\video_cn.mp4'); // Video gốc (hình)
  const [mixInstrumentalPath, setMixInstrumentalPath] = useState(
    'D:\\Dubbing\\instrumental.wav'
  ); // Nhạc nền
  const [mixVoicePath, setMixVoicePath] = useState('D:\\Dubbing\\audio_vi.wav'); // Giọng đọc AI
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleProcessWhisper = async () => {
    if (inputPath.trim()) {
      try {
        // Gọi API Java (Spring Boot)
        const response = await api.post(
          '/api/dubbing/vi/dubbing-whisper',
          { inputPath: inputPath.trim() },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    }
  };

  const handleProcessMakeAudio = async () => {
    if (makeAudioPath.trim()) {
      try {
        // Gọi API Java (Spring Boot)
        const response = await api.post(
          '/api/dubbing/vi/generate-dubbing-audio',
          { inputPath: makeAudioPath.trim() },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    }
  };
  const handleProcessMergeVideo = async () => {
    console.log('mixVideoPath:', mixVideoPath);
    console.log('mixInstrumentalPath:', mixInstrumentalPath);
    console.log('mixVoicePath:', mixVoicePath);

    if (
      !mixVideoPath.trim() ||
      !mixInstrumentalPath.trim() ||
      !mixVoicePath.trim()
    ) {
      alert('Vui lòng nhập đủ 3 đường dẫn: Video, Nhạc nền, và Giọng đọc!');
      return;
    }
    try {
      // Gọi API Java (Spring Boot)
      const response = await api.post(
        '/api/dubbing/vi/mix-video',
        {
          videoInput: mixVideoPath.trim(),
          instrumental: mixInstrumentalPath.trim(),
          voiceDub: mixVoicePath.trim(),
        },
        { retryEnabled: false }
      );
    } catch (error: unknown) {}
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
        {/* === TOOL 1: WHISPER === */}
        <h1 className="text-2xl font-bold mb-2 text-cyan-400">
          1. Whisper Tool (Wav to Srt)
        </h1>
        <div className="space-y-4 mb-8 border-b border-slate-700 pb-6">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Input: D:\Dubbing\pmh_vocals.wav"
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-cyan-500 outline-none text-slate-200"
          />
          <button
            onClick={handleProcessWhisper}
            disabled={status === 'loading'}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold transition disabled:opacity-50"
          >
            Chạy Whisper
          </button>
        </div>

        {/* === TOOL 2: MAKE AUDIO === */}
        <h1 className="text-2xl font-bold mb-2 text-cyan-400">
          2. Make Audio Tool (Srt to Wav)
        </h1>
        <div className="space-y-4 mb-8 border-b border-slate-700 pb-6">
          <input
            type="text"
            value={makeAudioPath}
            onChange={(e) => setMakeAudioPath(e.target.value)}
            placeholder="Input: D:\Dubbing\pmh_vi.srt"
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-cyan-500 outline-none text-slate-200"
          />
          <button
            onClick={handleProcessMakeAudio}
            disabled={status === 'loading'}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold transition disabled:opacity-50"
          >
            Tạo Giọng Đọc
          </button>
        </div>

        {/* === TOOL 3: MERGE VIDEO (ĐÃ SỬA) === */}
        <h1 className="text-2xl font-bold mb-2 text-cyan-400">
          3. Merge Video Tool (Mix)
        </h1>
        <div className="space-y-4 mb-4">
          {/* Input 1: Video Gốc */}
          <div>
            <label className="text-xs text-slate-400 ml-1">
              Video Gốc (Lấy hình)
            </label>
            <input
              type="text"
              value={mixVideoPath}
              onChange={(e) => setMixVideoPath(e.target.value)}
              placeholder="D:\Dubbing\pmh_video_cn.mp4"
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-purple-500 outline-none text-slate-200 text-sm"
            />
          </div>

          {/* Input 2: Nhạc Nền */}
          <div>
            <label className="text-xs text-slate-400 ml-1">
              Nhạc Nền (Instrumental)
            </label>
            <input
              type="text"
              value={mixInstrumentalPath}
              onChange={(e) => setMixInstrumentalPath(e.target.value)}
              placeholder="D:\Dubbing\pmh_instrumental.wav"
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-purple-500 outline-none text-slate-200 text-sm"
            />
          </div>

          {/* Input 3: Giọng Đọc */}
          <div>
            <label className="text-xs text-slate-400 ml-1">
              Giọng Đọc (Dubbing Voice)
            </label>
            <input
              type="text"
              value={mixVoicePath}
              onChange={(e) => setMixVoicePath(e.target.value)}
              placeholder="D:\Dubbing\pmh_audio_vi.wav"
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-purple-500 outline-none text-slate-200 text-sm"
            />
          </div>

          <button
            onClick={handleProcessMergeVideo}
            disabled={status === 'loading'}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold text-lg transition disabled:opacity-50 shadow-lg shadow-purple-500/30"
          >
            {status === 'loading' ? 'Đang Xử Lý...' : 'Hòa Âm & Xuất Video'}
          </button>
        </div>

        {/* === RESULT BOX === */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg border text-sm font-mono break-all ${
              status === 'success'
                ? 'bg-green-900/20 border-green-500/50 text-green-400'
                : status === 'error'
                ? 'bg-red-900/20 border-red-500/50 text-red-400'
                : 'bg-slate-700/50 border-slate-600 text-slate-300'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
export default DubbingPage;
