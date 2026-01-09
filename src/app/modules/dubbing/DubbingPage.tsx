'use client';
import React, { useRef, useState } from 'react';
import { api } from '@/app/lib/apiClient';

const DubbingPage: React.FC = () => {
  // --- STATE CHO WHISPER TOOL ---
  const [inputPath, setInputPath] = useState('D:\\Dubbing\\vocals.wav');

  // --- STATE CHO MAKE AUDIO TOOL ---
  const [makeAudioPath, setMakeAudioPath] = useState(
    'D:\\Dubbing\\vocals_vi.srt'
  );

  // --- STATE CHO MERGE VIDEO TOOL (MỚI) ---
  const [mixVideoPath, setMixVideoPath] = useState('D:\\Dubbing\\video_cn.mp4'); // Video gốc (hình)
  const [mixInstrumentalPath, setMixInstrumentalPath] = useState(
    'D:\\Dubbing\\instrumental.wav'
  ); // Nhạc nền
  const [mixVoicePath, setMixVoicePath] = useState('D:\\Dubbing\\audio_vi.wav'); // Giọng đọc AI

  // --- STATE CẤU HÌNH MIX (MỚI) ---
  const [musicVolume, setMusicVolume] = useState<number>(0.4);
  const [voiceVolume, setVoiceVolume] = useState<number>(3.0);
  const [duckingRatio, setDuckingRatio] = useState<number>(5.0);
  const [attackTime, setAttackTime] = useState<number>(50);
  const [releaseTime, setReleaseTime] = useState<number>(300);

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
          musicVolume,
          voiceVolume,
          duckingRatio,
          attackTime,
          releaseTime,
        },
        { retryEnabled: false }
      );
    } catch (error: unknown) {}
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      {/* Tăng chiều rộng max-w-lg lên max-w-5xl để chứa 2 cột */}
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-700">
        {/* ================================================================= */}
        {/* HÀNG 1: WHISPER (TRÁI) - MAKE AUDIO (PHẢI)                        */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-slate-600 pb-8">
          {/* CỘT TRÁI: WHISPER */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-cyan-400">
              1. Whisper Tool (Wav to Srt)
            </h1>
            <div className="space-y-3">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="Input: D:\Dubbing\vocals.wav"
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
          </div>

          {/* CỘT PHẢI: MAKE AUDIO */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-cyan-400">
              2. Make Audio Tool (Srt to Wav)
            </h1>
            <div className="space-y-3">
              <input
                type="text"
                value={makeAudioPath}
                onChange={(e) => setMakeAudioPath(e.target.value)}
                placeholder="Input: D:\Dubbing\vocals_vi.srt"
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
          </div>
        </div>

        {/* ================================================================= */}
        {/* HÀNG 2: MERGE VIDEO (TRÁI) - CẤU HÌNH MIX (PHẢI)                  */}
        {/* ================================================================= */}
        <div>
          <h1 className="text-2xl font-bold mb-4 text-cyan-400 text-center md:text-left">
            3. Merge Video Tool (Mix & Export)
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CỘT TRÁI: INPUT FILES */}
            <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Input Files
              </h3>

              <div>
                <label className="text-xs text-slate-400 ml-1">Video Gốc</label>
                <input
                  type="text"
                  value={mixVideoPath}
                  onChange={(e) => setMixVideoPath(e.target.value)}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 ml-1">Nhạc Nền</label>
                <input
                  type="text"
                  value={mixInstrumentalPath}
                  onChange={(e) => setMixInstrumentalPath(e.target.value)}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 ml-1">Giọng Đọc</label>
                <input
                  type="text"
                  value={mixVoicePath}
                  onChange={(e) => setMixVoicePath(e.target.value)}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            {/* CỘT PHẢI: CẤU HÌNH MIX */}
            <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Cấu hình Mix Âm Thanh
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Music Volume */}
                <div>
                  <label className="text-xs text-slate-400">Music Vol</label>
                  <input
                    type="number"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                  />
                </div>

                {/* Voice Volume */}
                <div>
                  <label className="text-xs text-slate-400">Voice Vol</label>
                  <input
                    type="number"
                    step="0.1"
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                  />
                </div>

                {/* Ducking Ratio */}
                <div className="col-span-2">
                  <label className="text-xs text-slate-400">
                    Ducking Ratio (Nén nhạc)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={duckingRatio}
                    onChange={(e) =>
                      setDuckingRatio(parseFloat(e.target.value))
                    }
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                  />
                </div>

                {/* Attack / Release */}
                <div>
                  <label className="text-xs text-slate-400">Attack (ms)</label>
                  <input
                    type="number"
                    value={attackTime}
                    onChange={(e) => setAttackTime(parseInt(e.target.value))}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Release (ms)</label>
                  <input
                    type="number"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(parseInt(e.target.value))}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NÚT SUBMIT CHO CẢ 2 CỘT */}
          <div className="mt-6">
            <button
              onClick={handleProcessMergeVideo}
              disabled={status === 'loading'}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition disabled:opacity-50 shadow-lg shadow-purple-500/30 uppercase tracking-widest"
            >
              {status === 'loading'
                ? 'Đang Xử Lý...'
                : '🎵 Hòa Âm & Xuất Video 🎬'}
            </button>
          </div>
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
