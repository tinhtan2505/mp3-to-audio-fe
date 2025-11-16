"use client";
import {
  Button,
  Card,
  Input,
  InputNumber,
  message,
  notification,
  Select,
  Space,
  Spin,
  Tooltip,
} from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AntDesignOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { api } from "@/app/lib/apiClient";
import { ApiResponse } from "@/app/lib/api-service";
import ReactPlayer from "react-player";

const VIET_VOICES = [
  { label: "Hoài My (vi-VN)", value: "vi-VN-HoaiMyNeural" },
  { label: "Nam Minh (vi-VN)", value: "vi-VN-NamMinhNeural" },
];

const DEFAULT_PAUSES = {
  word: 0,
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
    !!v && typeof v === "object" && "result" in (v as Record<string, unknown>)
  );
}

function hasDataField<T = string>(v: unknown): v is { data: ApiResponse<T> } {
  return (
    !!v && typeof v === "object" && "data" in (v as Record<string, unknown>)
  );
}

const WordListPage: React.FC = () => {
  // const handleBuild = async () => {
  //   const patients = await api.post<{ items: unknown[]; total: number }>(
  //     "/api/work-audio/build"
  //   );
  //   console.log(patients);
  // };
  const handleInsertData = async () => {
    const patients = await api.post<{ items: unknown[]; total: number }>(
      "/api/tts/vi/insert-words"
    );
    console.log(patients);
  };

  const [word, setWord] = useState(
    "Chào bạn! Tôi đang kiểm thử chức năng chuyển đổi văn bản sang giọng nói: ghép âm thanh từ các từ, dấu câu, và khoảng lặng. Ví dụ: một; hai; ba. (Đây là một câu hoàn chỉnh)."
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
  const [voice, setVoice] = useState<string | undefined>(VIET_VOICES[0].value);
  const [rate, setRate] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  // NEW STATE: Dùng để điều khiển việc ReactPlayer tự động phát (playing={true})
  const [playing, setPlaying] = useState(false);

  const disabled = useMemo(() => !word.trim() || loading, [word, loading]);

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

  function base64ToBlob(base64: string, mime = "audio/mpeg"): Blob {
    const cleaned = base64.replace(/^data:.*;base64,/, "");
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
    message.success("Phát âm hoàn tất 🎉");
  };

  const handlePlay = async () => {
    if (loading) return;
    setLoading(true);
    setPlaying(false); // Ngừng phát nếu đang phát

    try {
      const resp = await api.post(
        "/api/tts/vi/text-to-mp3",
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
      let data: ApiResponse<AudioResult> | undefined;
      if (isApiResponse<AudioResult>(resp)) {
        data = resp;
      } else if (hasDataField<AudioResult>(resp)) {
        data = resp.data;
      } else {
        // fallback: try to coerce (defensive)
        message.error("Server trả về định dạng không hợp lệ");
        console.error("Unexpected response shape:", resp);
        return;
      }

      console.log(data);

      const result = data?.result;

      const base64: string | undefined = result?.audio;
      const notFoundWords: string[] = Array.isArray(result?.notFoundWords)
        ? result.notFoundWords
        : [];

      if (notFoundWords.length > 0) {
        notification.open({
          message: "Từ chưa có trong cơ sở dữ liệu",
          description: `Không tìm thấy từ: ${notFoundWords.join(", ")}`,
          placement: "bottomRight",
          duration: 0,
          icon: <ExclamationCircleOutlined style={{ color: "#000" }} />,
          style: {
            border: "1px solid red",
            borderRadius: "8px",
          },
        });
      }

      if (!base64) {
        message.error("Không nhận được audio từ server");
        setLoading(false);
        return;
      }

      const blob = base64ToBlob(base64, "audio/mpeg");
      const url = URL.createObjectURL(blob);
      console.log(url);

      setAudioUrl(url);
      setPlaying(true);
      message.success("Đang tải và phát âm thanh...");
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      message.error("Không thể kết nối hoặc xử lý yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) {
      message.warning("Vui lòng tạo âm thanh trước khi tải xuống.");
      return;
    }

    // Tạo một thẻ <a> ẩn để kích hoạt tải xuống
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `tts-audio-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.info("Đang bắt đầu tải xuống file MP3.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-cyan-100 py-10 px-4 flex justify-center">
      <Card className="shadow-2xl rounded-3xl p-6 w-full max-w-5xl bg-white/90 backdrop-blur-sm">
        <h1 className="text-4xl font-extrabold mb-8 text-indigo-700 text-center">
          Chuyển đổi Văn bản thành Giọng nói (TTS)
        </h1>

        <div className="space-y-8">
          {/* Phần 1: Nhập văn bản */}
          <Card
            title="Văn bản đầu vào"
            className="rounded-xl shadow-md"
            styles={{
              // <-- Sử dụng styles
              header: {
                // <-- Định nghĩa style cho header
                backgroundColor: "#e0f2f1",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                fontWeight: "bold",
                color: "#004d40",
              },
            }}
          >
            <Input.TextArea
              rows={8}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Nhập nội dung cần đọc (hỗ trợ tiếng Việt)..."
              className="rounded-lg shadow-inner focus:shadow-lg transition-all text-lg border-indigo-200"
            />
          </Card>

          {/* Phần 2: Cấu hình Giọng nói */}
          <Card
            title="Cấu hình Giọng nói"
            className="rounded-xl shadow-md"
            styles={{
              header: {
                backgroundColor: "#e3f2fd",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                fontWeight: "bold",
                color: "#1565c0",
              },
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="mb-1 font-medium text-slate-600">
                  Chọn Giọng Đọc
                </label>
                <Select
                  value={voice}
                  onChange={(v) => setVoice(v)}
                  options={VIET_VOICES}
                  className="w-full h-10 rounded-lg shadow"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 font-medium text-slate-600">
                  Tốc độ Đọc (%)
                </label>
                <Input
                  type="number"
                  min={50}
                  max={200}
                  suffix="%"
                  value={rate}
                  onChange={(e) => setRate(parseInt(e.target.value) || 100)}
                  className="rounded-lg shadow h-10"
                />
              </div>
            </div>
          </Card>

          {/* Phần 3: Thiết lập ngắt nghỉ */}
          <Card
            title="Thiết lập Ngắt nghỉ Tùy chỉnh (Giây)"
            className="rounded-xl shadow-md"
            styles={{
              header: {
                backgroundColor: "#fbe9e7",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                fontWeight: "bold",
                color: "#d84315",
              },
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderPauseInput("wordPause", "Giữa hai từ")}
              {renderPauseInput("commaPause", "Dấu phẩy (,)")}
              {renderPauseInput("dotPause", "Dấu chấm (.)")}
              {renderPauseInput("semicolonPause", "Chấm phẩy (;)")}
              {renderPauseInput("colonPause", "Hai chấm (:)")}
              {renderPauseInput("questionPause", "Dấu hỏi (?)")}
              {renderPauseInput("exclamationPause", "Chấm than (!)")}
              {renderPauseInput("lineBreakPause", "Xuống dòng")}
              {renderPauseInput("parenthesisPause", "Ngoặc đơn/kép")}
            </div>
            <p className="mt-4 text-xs text-red-500 italic">
              * Thời gian ngắt nghỉ tính bằng giây. Giá trị mặc định là tốt nhất
              cho đa số trường hợp.
            </p>
          </Card>

          {/* Phần 4: Điều khiển & Phát */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="flex justify-center gap-4">
              <Button
                type="primary"
                size="large"
                className="px-10 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all h-12 flex items-center justify-center"
                onClick={handlePlay}
                disabled={disabled}
                icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />}
              >
                {loading ? "Đang tạo..." : "Tạo và Phát"}
              </Button>
              <Button
                size="large"
                className="px-10 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all h-12 flex items-center justify-center"
                onClick={handleDownload}
                disabled={!audioUrl || loading}
                icon={<DownloadOutlined />}
              >
                Tải xuống MP3
              </Button>
              <Button
                size="large"
                className="px-10 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all h-12 flex items-center justify-center"
                onClick={handleInsertData} // Đã thay đổi
                icon={<PlusOutlined />} // Đã thay đổi
              >
                Thêm dữ liệu
              </Button>
            </div>

            {/* TÍCH HỢP REACTPLAYER MỚI */}
            <div className="w-full max-w-4xl mt-6">
              {audioUrl ? (
                <ReactPlayer
                  src={audioUrl}
                  playing={playing}
                  controls={true}
                  onEnded={handleAudioEnd}
                  width="100%"
                  height="50px"
                  className="rounded-xl overflow-hidden shadow-2xl"
                />
              ) : (
                <div className="p-4 bg-slate-200 rounded-xl text-center text-slate-500 shadow-inner">
                  {loading ? (
                    <Spin
                      indicator={
                        <LoadingOutlined style={{ fontSize: 24 }} spin />
                      }
                    />
                  ) : (
                    'Nhấn "Tạo và Phát" để tạo file âm thanh.'
                  )}
                </div>
              )}
            </div>
            {/* KẾT THÚC TÍCH HỢP REACTPLAYER */}
          </div>
        </div>
      </Card>
    </div>
  );
};
export default WordListPage;
