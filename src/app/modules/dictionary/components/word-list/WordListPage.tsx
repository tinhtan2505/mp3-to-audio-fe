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
import React, { useMemo, useState } from "react";
import {
  AntDesignOutlined,
  DownloadOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { api } from "@/app/lib/apiClient";
const VIET_VOICES = [
  { label: "HoaiMy (vi-VN)", value: "vi-VN-HoaiMyNeural" },
  { label: "NamMinh (vi-VN)", value: "vi-VN-NamMinhNeural" },
];

const WordListPage: React.FC = () => {
  // const handleBuild = async () => {
  //   const patients = await api.post<{ items: unknown[]; total: number }>(
  //     "/api/work-audio/build"
  //   );
  //   console.log(patients);
  // };

  const [word, setWord] = useState("");
  const [voice, setVoice] = useState<string | undefined>(VIET_VOICES[0].value);
  const [rate, setRate] = useState<number>(100); // 100% = bình thường
  const [loading, setLoading] = useState(false);
  const disabled = useMemo(() => !word.trim() || loading, [word, loading]);

  const callTtsAndPlay = async () => {
    try {
      setLoading(true);

      // ⬇️ CÁCH 1: Gọi GET (đơn giản, chỉ 1 từ ngắn gọn)
      const w = word.trim();
      if (!w) {
        message.warning("Nhập 1 từ tiếng Việt");
        return;
      }

      const blob = await api.download("/api/tts/vi", {
        query: { word: w },
        retryEnabled: false,
      });

      // if (!res.ok) {
      //   // thử parse JSON lỗi nếu backend trả JSON
      //   let errText = "Gọi API thất bại";
      //   try {
      //     const j = await res.json();
      //     errText = j?.message || errText;
      //   } catch {
      //     // ignore
      //   }
      //   message.error(errText);
      //   return;
      // }

      // const blob = await res.blob(); // audio/mpeg
      // const url = URL.createObjectURL(blob);

      // // phát ngay
      // const audio = new Audio(url);
      // await audio.play();

      message.success("Phát âm thành công");
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
              placeholder="vd: xin chào"
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
