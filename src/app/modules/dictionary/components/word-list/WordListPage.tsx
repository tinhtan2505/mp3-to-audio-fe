'use client';
import { Input, message, notification, Spin } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { api } from '@/app/lib/apiClient';
import { ApiError, ApiResponse } from '@/app/lib/api-service';
import ReactPlayer from 'react-player';
import {
  Languages,
  Sparkles,
  Share2,
  Gauge,
  Clock,
  FileAudio,
  Wand2,
} from 'lucide-react';

const languageOptions = [
  {
    value: 'vi-VN',
    label: 'Tiếng Việt',
    description: 'Giọng Hà Nội & Sài Gòn',
  },
  { value: 'en-US', label: 'English', description: 'US & UK accents' },
  { value: 'ja-JP', label: '日本語', description: 'Nữ & Nam tiêu chuẩn' },
  { value: 'fr-FR', label: 'Français', description: 'Paris & Québec' },
];

type VoiceOption = {
  value: string;
  label: string;
  description: string;
};

const voiceOptions: Record<string, VoiceOption[]> = {
  'vi-VN': [
    { value: 'linh', label: 'Linh (Nữ)', description: 'Ấm áp, tự nhiên' },
    {
      value: 'minh',
      label: 'Minh (Nam)',
      description: 'Rõ ràng, phát âm chuẩn',
    },
  ],
  'en-US': [
    { value: 'ava', label: 'Ava (US)', description: 'Friendly, bright' },
    { value: 'oliver', label: 'Oliver (UK)', description: 'Warm, articulate' },
  ],
  'ja-JP': [
    { value: 'sakura', label: 'さくら', description: 'やさしい女性の声' },
    { value: 'ren', label: 'れん', description: '落ち着いた男性の声' },
  ],
  'fr-FR': [
    { value: 'camille', label: 'Camille', description: 'Élégante, dynamique' },
    { value: 'antoine', label: 'Antoine', description: 'Clair, posé' },
  ],
};

type Recording = {
  id: string;
  title: string;
  textExcerpt: string;
  language: string;
  voice: string;
  speed: number;
  pitch: number;
  duration: string;
  createdAt: string;
  shareUrl: string;
  audioUrl: string;
  thumbnails?: string[];
};

const mockRecordings: Recording[] = [
  {
    id: 'rec-001',
    title: 'Giới thiệu sản phẩm - Tiếng Việt',
    textExcerpt:
      'Xin chào, đây là bản chào mừng đến nền tảng chuyển văn bản thành giọng nói...',
    language: 'vi-VN',
    voice: 'linh',
    speed: 1,
    pitch: 1,
    duration: '00:42',
    createdAt: '18/11/2025, 10:12',
    shareUrl: 'https://youware.ai/r/rec-001',
    audioUrl: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
  },
  // {
  //   id: 'rec-002',
  //   title: 'Onboarding Flow - English',
  //   textExcerpt:
  //     'Welcome aboard! This narration walks you through the multi-language toolkit...',
  //   language: 'en-US',
  //   voice: 'ava',
  //   speed: 0.95,
  //   pitch: 1.05,
  //   duration: '01:08',
  //   createdAt: '17/11/2025, 17:39',
  //   shareUrl: 'https://youware.ai/r/rec-002',
  //   audioUrl: 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
  // },
  // {
  //   id: 'rec-003',
  //   title: 'Script e-learning - Français',
  //   textExcerpt:
  //     "Bonjour à tous, aujourd'hui nous découvrons les bases d'une diction convaincante...",
  //   language: 'fr-FR',
  //   voice: 'camille',
  //   speed: 1.1,
  //   pitch: 0.9,
  //   duration: '02:24',
  //   createdAt: '16/11/2025, 09:05',
  //   shareUrl: 'https://youware.ai/r/rec-003',
  //   audioUrl: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
  // },
];

const speedMarks = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
];

const pitchMarks = [
  { value: 0.75, label: 'Trầm' },
  { value: 1, label: 'Chuẩn' },
  { value: 1.25, label: 'Cao' },
];

const DEFAULT_PAUSES = {
  word: 0.05,
  comma: 0.25,
  dot: 0.7,
  semicolon: 0.5,
  colon: 0.4,
  question: 0.6,
  exclamation: 0.7,
  lineBreak: 1.2,
  parenthesis: 0.25,
};

// Định nghĩa types cho cấu hình ngắt nghỉ
interface PauseConfig {
  wordPause: number;
  dotPause: number;
  commaPause: number;
  semicolonPause: number;
  colonPause: number;
  questionPause: number;
  exclamationPause: number;
  lineBreakPause: number;
  parenthesisPause: number;
}

interface AudioResult {
  audio: string;
  notFoundWords: string[];
}

function isApiResponse<T = string>(v: unknown): v is ApiResponse<T> {
  return (
    !!v && typeof v === 'object' && 'result' in (v as Record<string, unknown>)
  );
}

function hasDataField<T = string>(v: unknown): v is { data: ApiResponse<T> } {
  return (
    !!v && typeof v === 'object' && 'data' in (v as Record<string, unknown>)
  );
}

const WordListPage: React.FC = () => {
  // const handleBuild = async () => {
  //   const patients = await api.post<{ items: unknown[]; total: number }>(
  //     "/api/work-audio/build"
  //   );
  //   console.log(patients);
  // };
  const handleInsertViettelData = async () => {
    const patients = await api.post<{ items: unknown[]; total: number }>(
      // '/api/tts/vi/insert-words'
      '/api/words/vi/speech-synthesis'
    );
    console.log(patients);
  };
  const handleInsertData = async () => {
    const patients = await api.post<{ items: unknown[]; total: number }>(
      '/api/tts/vi/insert-words'
    );
    console.log(patients);
  };

  const [word, setWord] = useState(
    'Đại Khư Tàn Lão Thôn, một đứa bé được những người già nhặt được ở bờ sông, đặt tên Tần Mục, tân tân khổ khổ nuôi hắn trưởng thành. Một ngày kia bóng đem buông xuống, bóng tối bao trùm Đại Khư, Tần Mục bước ra khỏi nhà'
  );
  const [config, setConfig] = useState<PauseConfig>({
    wordPause: DEFAULT_PAUSES.word,
    dotPause: DEFAULT_PAUSES.dot,
    commaPause: DEFAULT_PAUSES.comma,
    semicolonPause: DEFAULT_PAUSES.semicolon,
    colonPause: DEFAULT_PAUSES.colon,
    questionPause: DEFAULT_PAUSES.question,
    exclamationPause: DEFAULT_PAUSES.exclamation,
    lineBreakPause: DEFAULT_PAUSES.lineBreak,
    parenthesisPause: DEFAULT_PAUSES.parenthesis,
  });
  // Thay thế cho việc quản lý URL thủ công bằng Audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // NEW STATE: Dùng để điều khiển việc ReactPlayer tự động phát (playing={true})
  const [playing, setPlaying] = useState(false);

  // Ref để lưu trữ URL hiện tại phục vụ cho việc revokeObjectURL
  const currentUrlRef = useRef<string | null>(null);

  // Xử lý việc giải phóng URL (quan trọng để tránh rò rỉ bộ nhớ)
  useEffect(() => {
    // Cập nhật ref với URL mới
    const previousUrl = currentUrlRef.current;
    currentUrlRef.current = audioUrl;

    return () => {
      // Giải phóng URL cũ khi audioUrl thay đổi hoặc component unmount
      if (previousUrl && previousUrl !== audioUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      // Giải phóng URL cuối cùng khi component unmount
      if (audioUrl === null && currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, [audioUrl]);

  function base64ToBlob(base64: string, mime = 'audio/mpeg'): Blob {
    const cleaned = base64.replace(/^data:.*;base64,/, '');
    const chunkSize = 0x8000;
    const byteChars = atob(cleaned);
    const parts: ArrayBuffer[] = [];

    for (let offset = 0; offset < byteChars.length; offset += chunkSize) {
      const slice = byteChars.slice(offset, offset + chunkSize);
      const ua = new Uint8Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        ua[i] = slice.charCodeAt(i);
      }
      parts.push(ua.buffer);
    }
    return new Blob(parts, { type: mime });
  }

  const handleAudioEnd = () => {
    // Tắt cờ playing và thông báo khi ReactPlayer kết thúc phát
    setPlaying(false);
    message.success('Phát âm hoàn tất 🎉');
  };

  const handlePlay = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPlaying(false); // Ngừng phát nếu đang phát

    try {
      const resp = await api.post(
        '/api/tts-ai/vi/text-to-speech',
        {
          word: word,
          pauses: {
            wordPause: config.wordPause,
            dotPause: config.dotPause,
            commaPause: config.commaPause,
            semicolonPause: config.semicolonPause,
            colonPause: config.colonPause,
            questionPause: config.questionPause,
            exclamationPause: config.exclamationPause,
            lineBreakPause: config.lineBreakPause,
            parenthesisPause: config.parenthesisPause,
          },
        },
        { retryEnabled: false }
      );

      let data: ApiResponse<AudioResult>;

      if (isApiResponse<AudioResult>(resp)) {
        data = resp;
      } else if (hasDataField<AudioResult>(resp)) {
        data = resp.data;
      } else {
        message.error('Server trả về định dạng không hợp lệ');
        console.error('Unexpected response shape:', resp);
        return;
      }

      if (data.message) {
        message.success(data.message);
      }

      const result = data?.result;

      const base64: string | undefined = result?.audio;
      const notFoundWords: string[] = Array.isArray(result?.notFoundWords)
        ? result.notFoundWords
        : [];

      if (notFoundWords.length > 0) {
        notification.open({
          message: 'Từ chưa có trong cơ sở dữ liệu',
          description: `Không tìm thấy từ: ${notFoundWords.join(', ')}`,
          placement: 'bottomRight',
          duration: 0,
          icon: <ExclamationCircleOutlined style={{ color: '#000' }} />,
          style: {
            border: '1px solid red',
            borderRadius: '8px',
          },
        });
      }

      if (!base64) {
        message.error('Không nhận được audio từ server');
        setIsGenerating(false);
        return;
      }

      const blob = base64ToBlob(base64, 'audio/mpeg');
      const url = URL.createObjectURL(blob);
      console.log(url);

      setAudioUrl(url);
      setPlaying(true);
      message.success('Đang tải và phát âm thanh...');
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);

      if (error instanceof ApiError) {
        let errorMessage = `Lỗi [${error.status}]`;

        if (error.data && typeof error.data === 'object') {
          const serverMessage = error.data?.message;
          if (serverMessage) {
            errorMessage = serverMessage;
          } else if (typeof error.data === 'string') {
            errorMessage = error.data;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        message.error(`Yêu cầu thất bại: ${errorMessage}`);

        if (error.status === 401 && error.message.includes('Token')) {
          message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
      } else {
        message.error(
          'Đã xảy ra lỗi không xác định. Vui lòng kiểm tra console.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) {
      message.warning('Vui lòng tạo âm thanh trước khi tải xuống.');
      return;
    }

    // Tạo một thẻ <a> ẩn để kích hoạt tải xuống
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `tts-audio-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.info('Đang bắt đầu tải xuống file MP3.');
  };

  const renderPauseInput = (key: keyof PauseConfig, label: string) => {
    return (
      <div key={key} className="flex items-center gap-2">
        <span className="w-32 text-right text-sm text-slate-500 font-medium">
          {label}
        </span>
        <Input
          type="number"
          min={0}
          step={0.01}
          suffix="s"
          value={config[key]}
          onChange={(e) => {
            const numericValue = parseFloat(e.target.value);
            if (!isNaN(numericValue) && numericValue >= 0) {
              setConfig({
                ...config,
                [key]: numericValue,
              });
            }
          }}
          className="rounded-lg shadow"
        />
      </div>
    );
  };

  const [language, setLanguage] = useState(
    languageOptions[0]?.value ?? 'vi-VN'
  );
  const [voice, setVoice] = useState(voiceOptions[language]?.[0]?.value ?? '');
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableVoices = useMemo(
    () => voiceOptions[language] ?? [],
    [language]
  );

  useEffect(() => {
    if (!availableVoices.find((item) => item.value === voice)) {
      setVoice(availableVoices[0]?.value ?? '');
    }
  }, [availableVoices, voice]);

  const handleGenerate = () => {
    if (!word.trim()) {
      setSuccessMessage('Vui lòng nhập nội dung trước khi tạo giọng nói.');
      return;
    }

    setIsGenerating(true);
    setSuccessMessage(null);

    handlePlay();
  };

  const handleShare = async (recording: Recording) => {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      clipboard?: Clipboard;
    };

    try {
      if (nav.share) {
        await nav.share({
          title: recording.title,
          text: 'Nghe bản thu do YouWare TTS tạo',
          url: recording.shareUrl,
        });
        setShareFeedback(`Đã mở chia sẻ cho "${recording.title}".`);
      } else if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(recording.shareUrl);
        setShareFeedback(`Đã sao chép liên kết của "${recording.title}".`);
      } else {
        setShareFeedback('Thiết bị không hỗ trợ chia sẻ tự động.');
      }
    } catch (error) {
      setShareFeedback('Không thể chia sẻ, vui lòng thử lại.');
    }

    window.setTimeout(() => setShareFeedback(null), 3200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-40 top-[-10%] h-96 w-96 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-16 px-6 pb-24 pt-16 lg:px-12">
          <header className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200">
                <Sparkles className="h-4 w-4" />
                Text-to-Speech đa ngôn ngữ
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Chuyển văn bản thành giọng nói tự nhiên trong vài giây
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                Tùy chỉnh ngôn ngữ, giọng đọc, tốc độ và cao độ theo kịch bản
                của bạn. Quản lý, phát lại và chia sẻ bản ghi ngay trong một màn
                hình trực quan.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Languages className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-sm uppercase tracking-wide text-slate-400">
                    Hỗ trợ
                  </p>
                  <p className="text-lg font-medium text-white">25+ ngôn ngữ</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Gauge className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-sm uppercase tracking-wide text-slate-400">
                    Kiểm soát
                  </p>
                  <p className="text-lg font-medium text-white">
                    Tốc độ & Cao độ
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Share2 className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="text-sm uppercase tracking-wide text-slate-400">
                    Chia sẻ
                  </p>
                  <p className="text-lg font-medium text-white">
                    Liên kết bảo mật
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500/30 via-indigo-500/20 to-transparent blur-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  Bảng điều khiển nhanh
                </h2>
                <div className="space-y-4 text-sm text-slate-200">
                  <p className="flex items-center justify-between">
                    <span>Ngôn ngữ đang chọn</span>
                    <strong className="text-white">
                      {languageOptions.find((item) => item.value === language)
                        ?.label ?? ''}
                    </strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Giọng</span>
                    <strong className="text-white">
                      {availableVoices.find((item) => item.value === voice)
                        ?.label ?? 'Tùy chỉnh'}
                    </strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Tốc độ</span>
                    <strong className="text-white">{speed.toFixed(2)}x</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Cao độ</span>
                    <strong className="text-white">{pitch.toFixed(2)}</strong>
                  </p>
                  <div className="mt-6 rounded-2xl bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Gợi ý
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      Kết nối API ngay sau khi nội dung được duyệt để đồng bộ
                      bản ghi với backend YouWare.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 flex items-center gap-3">
                <Wand2 className="h-5 w-5 text-sky-300" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Tạo giọng nói mới
                  </h2>
                  <p className="text-sm text-slate-400">
                    Nhập văn bản, chọn tham số và bấm tạo. Hệ thống sẽ lưu bản
                    ghi vào danh sách bên phải.
                  </p>
                </div>
              </div>

              <label className="mb-6 block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Nội dung
                </span>
                <textarea
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Nhập hoặc dán kịch bản bạn muốn chuyển thành giọng nói..."
                />
              </label>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Ngôn ngữ
                  </span>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} · {option.description}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Giọng đọc
                  </span>
                  <select
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    {availableVoices.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} · {option.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Tốc độ đọc</span>
                    <span className="font-medium text-sky-200">
                      {speed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={speed}
                    onChange={(event) =>
                      setSpeed(parseFloat(event.target.value))
                    }
                    className="mt-3 w-full accent-sky-400"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    {speedMarks.map((mark) => (
                      <span key={mark.value}>{mark.label}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Cao độ</span>
                    <span className="font-medium text-sky-200">
                      {pitch.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.3"
                    step="0.05"
                    value={pitch}
                    onChange={(event) =>
                      setPitch(parseFloat(event.target.value))
                    }
                    className="mt-3 w-full accent-sky-400"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    {pitchMarks.map((mark) => (
                      <span key={mark.value}>{mark.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Đang tạo...' : 'Tạo giọng nói'}
                </button>
                <button
                  onClick={handleInsertViettelData}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  VIETTEL
                </button>
                <button
                  onClick={handleInsertData}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Thêm dữ liệu
                </button>
                {/* <p className="text-sm text-slate-400">
                  Xuất file MP3/WAV
                  <br />· Sẵn sàng cho ứng dụng web của bạn
                </p> */}
              </div>

              {successMessage && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Bản ghi gần đây
                  </h2>
                  <p className="text-sm text-slate-400">
                    Phát lại, tải xuống và chia sẻ trực tiếp từ thư viện.
                  </p>
                </div>
                <Clock className="h-5 w-5 text-sky-200" />
              </div>

              {shareFeedback && (
                <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  {shareFeedback}
                </div>
              )}

              <div className="space-y-5">
                {mockRecordings.map((recording) => (
                  <article
                    key={recording.id}
                    className="group rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-inner transition hover:border-sky-400/60"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {recording.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {recording.textExcerpt}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                          {recording.duration}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-slate-400">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1">
                          <Languages className="h-3.5 w-3.5 text-sky-300" />
                          {languageOptions.find(
                            (item) => item.value === recording.language
                          )?.label ?? recording.language}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1">
                          <FileAudio className="h-3.5 w-3.5 text-sky-300" />
                          {voiceOptions[recording.language]?.find(
                            (item) => item.value === recording.voice
                          )?.label ?? recording.voice}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1">
                          <Gauge className="h-3.5 w-3.5 text-sky-300" />
                          {recording.speed}x · Pitch {recording.pitch}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                        {audioUrl ? (
                          <ReactPlayer
                            src={audioUrl}
                            playing={playing}
                            controls={true}
                            onEnded={handleAudioEnd}
                            width="100%"
                            height="48px"
                          />
                        ) : (
                          <div className="p-4 bg-slate-200 rounded-xl text-center text-slate-500 shadow-inner">
                            {isGenerating ? (
                              <Spin
                                indicator={
                                  <LoadingOutlined
                                    style={{ fontSize: 24 }}
                                    spin
                                  />
                                }
                              />
                            ) : (
                              'Nhấn "Tạo và Phát" để tạo file âm thanh.'
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-slate-400">
                          Tạo lúc {recording.createdAt}
                        </p>
                        <div className="flex items-center gap-3">
                          <a
                            href={recording.shareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-sky-400/60 hover:text-sky-200"
                          >
                            Mở liên kết
                          </a>
                          <button
                            onClick={() => handleShare(recording)}
                            className="inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          >
                            <Share2 className="h-4 w-4" />
                            Chia sẻ
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-xl">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Tích hợp nhanh chóng
                </h3>
                <p className="mt-3 text-base text-slate-200">
                  Nhúng API REST hoặc SDK vào ứng dụng Next.js/React chỉ với vài
                  dòng cấu hình. Hỗ trợ token bảo mật và quota linh hoạt.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Quy trình cộng tác
                </h3>
                <p className="mt-3 text-base text-slate-200">
                  Mời biên tập viên vào workspace, phân quyền tải xuống, tái tạo
                  bản ghi và quản lý phiên bản dễ dàng.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Hỗ trợ đa nền tảng
                </h3>
                <p className="mt-3 text-base text-slate-200">
                  Các bản ghi tương thích với web, mobile, thiết bị nhúng và có
                  thể đẩy thẳng lên LMS hoặc hệ thống trợ lý ảo.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Chính sách bảo mật
                </h3>
                <p className="mt-3 text-base text-slate-200">
                  Dữ liệu văn bản và bản ghi được mã hóa, có nhật ký truy cập và
                  cơ chế xóa an toàn theo yêu cầu.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
export default WordListPage;
