"use client";
import {
  Button,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tooltip,
} from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AntDesignOutlined,
  DownloadOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { api } from "@/app/lib/apiClient";
import { ApiResponse } from "@/app/lib/api-service";
const VIET_VOICES = [
  { label: "HoaiMy (vi-VN)", value: "vi-VN-HoaiMyNeural" },
  { label: "NamMinh (vi-VN)", value: "vi-VN-NamMinhNeural" },
];

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
  const handleInsertDb = async () => {
    const patients = await api.post<{ items: unknown[]; total: number }>(
      "/api/tts/vi/insert-words"
    );
    console.log(patients);
  };

  const [word, setWord] = useState("bà biết bánh bao");
  const [voice, setVoice] = useState<string | undefined>(VIET_VOICES[0].value);
  const [rate, setRate] = useState<number>(100); // 100% = bình thường
  const [loading, setLoading] = useState(false);
  const disabled = useMemo(() => !word.trim() || loading, [word, loading]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      // cleanup khi component unmount
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const callTtsAndPlay = async () => {
    try {
      setLoading(true);

      // ⬇️ CÁCH 1: Gọi GET (đơn giản, chỉ 1 từ ngắn gọn)
      const w = word.trim();
      if (!w) {
        message.warning("Nhập 1 từ tiếng Việt");
        return;
      }

      // ⛔ Dừng phát cũ nếu có
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
        audioRef.current = null;
      }
      if (urlRef.current) {
        try {
          URL.revokeObjectURL(urlRef.current);
        } catch {}
        urlRef.current = null;
      }

      const resp = await api.post(
        "/api/tts/vi/text-to-mp3",
        { word: "bà biết bánh bao" },
        { retryEnabled: false }
      );

      // adjust if api.post wraps data differently, e.g. resp.data
      let data: ApiResponse<string> | undefined;
      if (isApiResponse<string>(resp)) {
        // case: api.post returned the body directly
        data = resp;
      } else if (hasDataField<string>(resp)) {
        // case: api.post returned { data: ApiResponse }
        data = resp.data;
      } else {
        // fallback: try to coerce (defensive)
        message.error("Server trả về định dạng không hợp lệ");
        console.error("Unexpected response shape:", resp);
        return;
      }
      // now find base64 string
      const base64 = data.result ?? data?.result;
      if (!base64) {
        console.error("Invalid response", resp);
        message.error("Không nhận được audio từ server");
        return;
      }

      // decode base64 -> Blob
      const blob = base64ToBlob(base64, "audio/mpeg");
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      try {
        await audio.play();
        message.success("Đang phát");
      } catch (playErr) {
        console.error("Play failed", playErr);
        message.error("Không thể phát âm thanh trong trình duyệt");
      }

      audio.onended = () => {
        try {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
          }
        } catch {}
        message.success("Phát âm hoàn tất 🎉");
      };
    } catch (e: unknown) {
      if (e instanceof Error) {
        message.error(e.message);
      } else {
        console.error(e);
        message.error("Đã xảy ra lỗi không xác định");
      }
    } finally {
      setLoading(false);
    }
  };

  function base64ToBlob(base64: string, mime = "audio/mpeg"): Blob {
    const cleaned = base64.replace(/^data:.*;base64,/, "");
    const chunkSize = 0x8000; // 32KB
    const byteChars = atob(cleaned);
    const parts: ArrayBuffer[] = [];

    for (let offset = 0; offset < byteChars.length; offset += chunkSize) {
      const slice = byteChars.slice(offset, offset + chunkSize);
      const ua = new Uint8Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        ua[i] = slice.charCodeAt(i);
      }
      // push ArrayBuffer explicitly (not Uint8Array)
      parts.push(ua.buffer);
    }

    // Blob accepts ArrayBuffer[] fine
    return new Blob(parts, { type: mime });
  }

  const callTtsAndDownload = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({
        word: word.trim(),
        ...(voice ? { voice } : {}),
        ...(rate && rate !== 100 ? { rate: String(rate) } : {}),
      }).toString();

      const res = await fetch(`/api/tts/vi?${qs}`);
      if (!res.ok) {
        let errText = "Gọi API thất bại";
        try {
          const j = await res.json();
          errText = j?.message || errText;
        } catch {}
        message.error(errText);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${word.trim().replace(/[^\p{L}\p{N}_-]+/gu, "_")}.mp3`;
      a.click();
      message.success("Đã tải file MP3");
    } catch (e: unknown) {
      if (e instanceof Error) {
        message.error(e.message);
      } else {
        console.error(e);
        message.error("Đã xảy ra lỗi không xác định");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div>
        <Button
          size="large"
          icon={<DownloadOutlined />}
          disabled
          onClick={handleInsertDb}
        >
          Tạo Db
        </Button>
      </div>
      <h1 className="text-xl font-semibold mb-4">
        Đọc 1 từ tiếng Việt (Azure TTS)
      </h1>

      <Space direction="vertical" size="middle" className="w-full">
        <div className="flex items-center gap-3">
          <div className="grow">
            <div className="mb-1 text-sm text-gray-600">Từ tiếng Việt</div>
            <Input
              allowClear
              size="large"
              placeholder="Nhập câu"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="mb-1 text-sm text-gray-600">Voice</div>
            <Select
              className="w-full"
              size="large"
              value={voice}
              onChange={setVoice}
              options={VIET_VOICES}
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-600">Rate (%)</div>
            <Tooltip title="100% = bình thường; 80% chậm; 120% nhanh">
              <InputNumber
                className="w-full"
                size="large"
                min={50}
                max={200}
                step={5}
                value={rate}
                onChange={(v) => setRate(typeof v === "number" ? v : 100)}
              />
            </Tooltip>
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            size="large"
            icon={<SoundOutlined />}
            loading={loading}
            disabled={disabled}
            onClick={callTtsAndPlay}
          >
            Phát âm
          </Button>

          <Button
            size="large"
            icon={<DownloadOutlined />}
            loading={loading}
            disabled={disabled}
            onClick={callTtsAndDownload}
          >
            Tải MP3
          </Button>
        </Space>
      </Space>
    </div>
  );
};
export default WordListPage;
