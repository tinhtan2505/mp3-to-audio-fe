'use client';
import React, { useState } from 'react';
import { api } from '@/app/lib/apiClient';

// Định nghĩa kiểu dữ liệu trả về từ API Detect
interface DetectRegion {
  logo_x: number;
  logo_y: number;
  logo_w: number;
  logo_h: number;
  confidence: number;
  sample_text: string;
}

const DubbingPage: React.FC = () => {
  // --- STATE CẤU HÌNH CHUNG ---
  const [baseDir, setBaseDir] = useState('D:\\Dubbing');

  // --- STATE CHO WHISPER TOOL ---
  const [inputFilename, setInputFilename] = useState('vocals.wav');
  const [enableDiarization, setEnableDiarization] = useState<boolean>(false);

  // --- STATE CHO TRANSLATE TOOL ---
  const [transInputFilename, setTransInputFilename] = useState('vocals.srt');

  // --- STATE CHO MAKE AUDIO TOOL ---
  const [makeAudioFilename, setMakeAudioFilename] = useState('vocals_vi.srt');

  // --- STATE CHO MERGE VIDEO TOOL ---
  const [mixVideoFilename, setMixVideoFilename] = useState('video_cn.mp4');
  const [mixInstrumentalFilename, setMixInstrumentalFilename] =
    useState('vocals.wav');
  const [mixVoiceFilename, setMixVoiceFilename] = useState(
    'vocals_vi_audio.wav'
  );

  // --- STATE CẤU HÌNH MIX ---
  const [musicVolume, setMusicVolume] = useState<number>(0.1);
  const [voiceVolume, setVoiceVolume] = useState<number>(3.5);
  const [duckingRatio, setDuckingRatio] = useState<number>(7.0);
  const [attackTime, setAttackTime] = useState<number>(50);
  const [releaseTime, setReleaseTime] = useState<number>(300);

  // --- STATE CẤU HÌNH XÓA LOGO ---
  const [removeLogo, setRemoveLogo] = useState<boolean>(false);
  const [logoX, setLogoX] = useState<number>(65);
  const [logoY, setLogoY] = useState<number>(815);
  const [logoW, setLogoW] = useState<number>(590);
  const [logoH, setLogoH] = useState<number>(60);
  const [isCrop, setIsCrop] = useState<boolean>(false);

  // 🔥 STATE MỚI CHO DETECT LOGO
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectSkipTop, setDetectSkipTop] = useState(true); // Bỏ qua 2/3 trên

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  // --- HELPER: GHÉP ĐƯỜNG DẪN ---
  const getFullPath = (filename: string) => {
    const cleanBase = baseDir.endsWith('\\') ? baseDir : `${baseDir}\\`;
    const cleanFile = filename.startsWith('\\')
      ? filename.substring(1)
      : filename;
    return `${cleanBase}${cleanFile}`;
  };

  // --- HANDLERS ---
  const handleProcessWhisper = async () => {
    if (baseDir.trim() && inputFilename.trim()) {
      const fullPath = getFullPath(inputFilename.trim());
      try {
        await api.post(
          '/api/dubbing/vi/dubbing-whisper',
          { inputPath: fullPath, enableDiarization: enableDiarization },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    } else {
      alert('Vui lòng nhập thư mục gốc và tên file!');
    }
  };

  const handleProcessTranslate = async () => {
    if (baseDir.trim() && transInputFilename.trim()) {
      const fullPath = getFullPath(transInputFilename.trim());
      setStatus('loading');
      setMessage('Đang dịch thuật...');
      try {
        await api.post(
          '/api/dubbing/vi/translate',
          { inputPath: fullPath },
          { retryEnabled: false }
        );
        setStatus('success');
        setMessage('Dịch thuật thành công!');
      } catch (error: unknown) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      }
    } else {
      alert('Vui lòng nhập thư mục gốc và tên file!');
    }
  };

  const handleProcessMakeAudio = async () => {
    if (baseDir.trim() && makeAudioFilename.trim()) {
      const fullPath = getFullPath(makeAudioFilename.trim());
      try {
        await api.post(
          '/api/dubbing/vi/generate-dubbing-audio',
          { inputPath: fullPath },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    } else {
      alert('Vui lòng nhập thư mục gốc và tên file!');
    }
  };

  // 🔥 HANDLER MỚI: AUTO DETECT LOGO
  const handleAutoDetect = async () => {
    if (!baseDir.trim() || !mixVideoFilename.trim()) {
      alert('Vui lòng nhập đường dẫn Video Gốc trước để quét!');
      return;
    }

    setIsDetecting(true);
    setMessage('Đang quét video để tìm logo/subtitles...');

    try {
      const fullPath = getFullPath(mixVideoFilename.trim());

      const response = await api.post('/api/dubbing/vi/detect-text-regions', {
        videoPath: fullPath,
        skipTopTwoThirds: detectSkipTop,
      });

      // Lấy data từ response (cấu trúc Java trả về CustomResponse.data là map của Python)
      // const resultData = response.data.data;

      // if (resultData && resultData.regions && resultData.regions.length > 0) {
      //   // Lấy vùng đầu tiên tìm được (thường là vùng quan trọng nhất sau khi merge)
      //   const bestRegion: DetectRegion = resultData.regions[0];

      //   setLogoX(bestRegion.logo_x);
      //   setLogoY(bestRegion.logo_y);
      //   setLogoW(bestRegion.logo_w);
      //   setLogoH(bestRegion.logo_h);

      //   setStatus('success');
      //   setMessage(`✅ Tìm thấy ${resultData.regions.length} vùng. Đã điền thông số vùng: ${bestRegion.sample_text || 'Unknown'}`);
      // } else {
      //   setStatus('error');
      //   setMessage('⚠️ Không tìm thấy vùng text/logo nào!');
      // }
    } catch (error: unknown) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Lỗi khi detect logo'
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleProcessMergeVideo = async () => {
    if (
      !baseDir.trim() ||
      !mixVideoFilename.trim() ||
      !mixInstrumentalFilename.trim() ||
      !mixVoiceFilename.trim()
    ) {
      alert('Vui lòng nhập đầy đủ thư mục gốc và 3 tên file!');
      return;
    }

    setStatus('loading');
    setMessage('Đang xử lý...');

    try {
      await api.post(
        '/api/dubbing/vi/mix-video',
        {
          videoInput: getFullPath(mixVideoFilename.trim()),
          instrumental: getFullPath(mixInstrumentalFilename.trim()),
          voiceDub: getFullPath(mixVoiceFilename.trim()),
          musicVolume,
          voiceVolume,
          duckingRatio,
          attackTime,
          releaseTime,
          removeLogo,
          logoX,
          logoY,
          logoW,
          logoH,
          crop: isCrop,
        },
        { retryEnabled: false }
      );
      setStatus('success');
      setMessage('Xử lý thành công!');
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  // --- STATE CHO TTS TỪ SRT VI ---
  const [viSrtFilename, setViSrtFilename] = useState('vocals_vi.srt');

  // --- HANDLER ---
  const handleTtsFromViSrt = async () => {
    if (baseDir.trim() && viSrtFilename.trim()) {
      const fullPath = getFullPath(viSrtFilename.trim());
      setStatus('loading');
      setMessage('Đang tạo hàng loạt file TTS...');
      try {
        const response = await api.post(
          '/api/dubbing/vi/tts-from-srt',
          { inputPath: fullPath },
          { retryEnabled: false }
        );
        setStatus('success');
        setMessage(`Thành công! Các file lưu tại`);
      } catch (error: unknown) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Lỗi khi tạo TTS');
      }
    } else {
      alert('Vui lòng nhập tên file SRT tiếng Việt!');
    }
  };

  // --- HANDLER CHO MIX BATCH ---
  const handleMixAudioBatch = async () => {
    if (baseDir.trim() && viSrtFilename.trim()) {
      const fullPath = getFullPath(viSrtFilename.trim());
      setStatus('loading');
      setMessage('Đang hợp nhất các file MP3 thành file WAV dài...');
      try {
        const response = await api.post(
          '/api/dubbing/vi/mix-audio-batch',
          { inputPath: fullPath },
          { retryEnabled: false }
        );
        setStatus('success');
        // response.data.data.outputFile chứa đường dẫn file .wav cuối cùng
        setMessage(`Thành công! File audio tổng`);
      } catch (error: unknown) {
        setStatus('error');
        setMessage(
          error instanceof Error ? error.message : 'Lỗi khi hợp nhất audio'
        );
      }
    } else {
      alert('Vui lòng nhập tên file SRT đã có các file MP3 tương ứng!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-700">
        {/* GLOBAL CONFIG */}
        <div className="mb-8 bg-slate-900/80 p-4 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <label className="block text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider">
            📁 Thư mục gốc (Base Directory)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={baseDir}
              onChange={(e) => setBaseDir(e.target.value)}
              placeholder="Ví dụ: D:\Dubbing"
              className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-slate-200 font-mono text-lg"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 italic">
            * Các công cụ bên dưới sẽ tự động nối tên file vào thư mục này.
          </p>
        </div>

        {/* HÀNG 1: WHISPER & TRANSLATE & MAKE AUDIO */}
        {/* HÀNG 1: 1. WHISPER & 2. MAKE AUDIO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-slate-700 pb-8">
          {/* 1. WHISPER TOOL */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-cyan-400">
              1. Whisper Tool (Wav to Srt)
            </h1>
            <div className="space-y-3">
              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600 focus-within:border-cyan-500 overflow-hidden">
                <span className="pl-3 text-slate-500 text-sm select-none shrink-0 max-w-[100px] truncate">
                  {baseDir}\
                </span>
                <input
                  type="text"
                  value={inputFilename}
                  onChange={(e) => setInputFilename(e.target.value)}
                  placeholder="vocals.wav"
                  className="w-full p-3 bg-transparent outline-none text-slate-200"
                />
              </div>
              {/* <div className="flex items-center gap-2 px-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enableDiarization}
                    onChange={(e) => setEnableDiarization(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
                <span className="text-sm text-slate-300">
                  Phân loại người nói
                </span>
              </div> */}
              <button
                onClick={handleProcessWhisper}
                disabled={status === 'loading'}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold transition disabled:opacity-50"
              >
                Chạy Whisper
              </button>
            </div>
          </div>

          {/* 2. MAKE AUDIO TOOL */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-cyan-400">
              2. Make Audio Tool (Srt to Wav)
            </h1>
            <div className="space-y-3">
              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600 focus-within:border-cyan-500 overflow-hidden">
                <span className="pl-3 text-slate-500 text-sm select-none shrink-0 max-w-[100px] truncate">
                  {baseDir}\
                </span>
                <input
                  type="text"
                  value={makeAudioFilename}
                  onChange={(e) => setMakeAudioFilename(e.target.value)}
                  placeholder="vocals_vi.srt"
                  className="w-full p-3 bg-transparent outline-none text-slate-200"
                />
              </div>
              <button
                onClick={handleProcessMakeAudio}
                disabled={status === 'loading'}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold transition disabled:opacity-50"
              >
                Tạo Giọng Đọc (Wav)
              </button>
            </div>
          </div>
        </div>

        {/* HÀNG MỚI: 1.5 TRANSLATE & 2.5 BATCH TTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-slate-700 pb-8">
          {/* 1.5 TRANSLATE TOOL */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-green-400">
              3. Translate Tool (Trung to Việt)
            </h1>
            <div className="space-y-3">
              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600 focus-within:border-green-500 overflow-hidden">
                <span className="pl-3 text-slate-500 text-sm select-none shrink-0 max-w-[100px] truncate">
                  {baseDir}\
                </span>
                <input
                  type="text"
                  value={transInputFilename}
                  onChange={(e) => setTransInputFilename(e.target.value)}
                  placeholder="vocals.srt"
                  className="w-full p-3 bg-transparent outline-none text-slate-200"
                />
              </div>
              <button
                onClick={handleProcessTranslate}
                disabled={status === 'loading'}
                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-bold transition disabled:opacity-50"
              >
                Dịch Thuật (Gemini AI)
              </button>
            </div>
          </div>

          {/* 2.5 BATCH TTS TOOL */}
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-yellow-400">
              4. Batch TTS Tool (Srt to MP3s)
            </h1>
            <div className="space-y-3 bg-slate-900/30 p-4 rounded-xl border border-yellow-500/20">
              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600 focus-within:border-yellow-500 overflow-hidden">
                <span className="pl-3 text-slate-500 text-sm select-none shrink-0 max-w-[100px] truncate">
                  {baseDir}\
                </span>
                <input
                  type="text"
                  value={viSrtFilename}
                  onChange={(e) => setViSrtFilename(e.target.value)}
                  placeholder="vocals_vi.srt"
                  className="w-full p-3 bg-transparent outline-none text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleTtsFromViSrt}
                  disabled={status === 'loading'}
                  className="py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-bold transition disabled:opacity-50 text-slate-900 text-sm"
                >
                  1. Tạo MP3 Hàng Loạt
                </button>

                <button
                  onClick={handleMixAudioBatch}
                  disabled={status === 'loading'}
                  className="py-2 bg-orange-600 hover:bg-orange-500 rounded font-bold transition disabled:opacity-50 text-white text-sm"
                >
                  2. Hợp Nhất Thành File Tổng
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1">
                * Bước 2 sẽ tự động tăng tốc các đoạn audio bị dài hơn thời gian
                phụ đề.
              </p>
            </div>
          </div>
        </div>

        {/* HÀNG 2: MERGE VIDEO */}
        <div>
          <h1 className="text-2xl font-bold mb-4 text-cyan-400 text-center md:text-left">
            5. Merge Video Tool (Mix & Export)
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CỘT TRÁI: INPUT FILES */}
            <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700 h-fit">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Input Files
              </h3>
              {[
                {
                  label: 'Video Gốc',
                  val: mixVideoFilename,
                  set: setMixVideoFilename,
                },
                {
                  label: 'Nhạc Nền',
                  val: mixInstrumentalFilename,
                  set: setMixInstrumentalFilename,
                },
                {
                  label: 'Giọng Đọc',
                  val: mixVoiceFilename,
                  set: setMixVoiceFilename,
                },
              ].map((item, idx) => (
                <div key={idx}>
                  <label className="text-xs text-slate-400 ml-1">
                    {item.label}
                  </label>
                  <div className="flex items-center bg-slate-800 rounded border border-slate-600 focus-within:border-purple-500">
                    <span className="pl-2 text-slate-500 text-xs select-none max-w-[80px] truncate">
                      {baseDir}\
                    </span>
                    <input
                      type="text"
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                      className="w-full p-2 bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* CỘT PHẢI: CẤU HÌNH (AUDIO + LOGO) */}
            <div className="space-y-4">
              {/* 1. AUDIO CONFIG */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Mix Âm Thanh
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Music Vol</label>
                    <input
                      type="number"
                      step="0.1"
                      value={musicVolume}
                      onChange={(e) =>
                        setMusicVolume(parseFloat(e.target.value))
                      }
                      className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Voice Vol</label>
                    <input
                      type="number"
                      step="0.1"
                      value={voiceVolume}
                      onChange={(e) =>
                        setVoiceVolume(parseFloat(e.target.value))
                      }
                      className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                  {/* ... Ducking, Attack, Release giữ nguyên ... */}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400">
                      Ducking Ratio
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
                  <div>
                    <label className="text-xs text-slate-400">
                      Attack (ms)
                    </label>
                    <input
                      type="number"
                      value={attackTime}
                      onChange={(e) => setAttackTime(parseInt(e.target.value))}
                      className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">
                      Release (ms)
                    </label>
                    <input
                      type="number"
                      value={releaseTime}
                      onChange={(e) => setReleaseTime(parseInt(e.target.value))}
                      className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. LOGO REMOVAL CONFIG (🔥 ĐÃ CẬP NHẬT) */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Xóa Logo
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={removeLogo}
                      onChange={(e) => setRemoveLogo(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {removeLogo && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* 🔥 SECTION NÚT AUTO DETECT */}
                    <div className="mb-4 flex items-center justify-between bg-slate-800/50 p-3 rounded border border-slate-600/50">
                      <span className="text-sm text-slate-300 font-medium">
                        Crop Video
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isCrop}
                          onChange={(e) => setIsCrop(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                    <div className="mb-3 p-2 bg-slate-800/50 rounded border border-slate-600/50 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="skipTop"
                          checked={detectSkipTop}
                          onChange={(e) => setDetectSkipTop(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-green-500 focus:ring-green-500"
                        />
                        <label
                          htmlFor="skipTop"
                          className="text-xs text-slate-400 cursor-pointer select-none"
                        >
                          Bỏ qua 2/3 trên (Header/Title)
                        </label>
                      </div>
                      <button
                        onClick={handleAutoDetect}
                        disabled={isDetecting}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase rounded transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isDetecting ? <>Wait...</> : <>🔍 Tự động tìm Logo</>}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-slate-400">X</label>
                        <input
                          type="number"
                          value={logoX}
                          onChange={(e) => setLogoX(parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Y</label>
                        <input
                          type="number"
                          value={logoY}
                          onChange={(e) => setLogoY(parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Width</label>
                        <input
                          type="number"
                          value={logoW}
                          onChange={(e) => setLogoW(parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Height</label>
                        <input
                          type="number"
                          value={logoH}
                          onChange={(e) => setLogoH(parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  * Bật tùy chọn này sẽ render lại video (tốn thời gian hơn).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleProcessMergeVideo}
              disabled={status === 'loading' || isDetecting}
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
