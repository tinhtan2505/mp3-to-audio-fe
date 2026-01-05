"use client";
import React, { useRef, useState } from "react";
import { api } from "@/app/lib/apiClient";

const DubbingPage: React.FC = () => {
  const [inputPath, setInputPath] = useState("");
  const [makeAudioPath, setMakeAudioPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Dùng cho chọn file
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Khi chọn file thì clear đường dẫn nhập tay để tránh nhầm lẫn
      setInputPath("");
      setMessage(`Đã chọn: ${file.name}`);
    }
  };

  const handleProcess = async () => {
    if (inputPath.trim()) {
      try {
        // Gọi API Java (Spring Boot)
        const response = await api.post(
          "/api/dubbing/vi/dubbing-whisper",
          { inputPath: inputPath.trim() },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    }
    // try {
    //   // Gọi API Java (Spring Boot)
    //   const response = await api.post(
    //     "/api/dubbing/vi/dubbing-whisper",
    //     { inputPath: inputPath.trim() },
    //     { retryEnabled: false }
    //   );
    // } catch (error: unknown) {}
    // if (selectedFile) {
    //   const formData = new FormData();
    //   console.log(selectedFile);

    //   formData.append("file", selectedFile);
    //   // try {
    //   //   // Gọi API Java (Spring Boot)
    //   //   const response = await api.post(
    //   //     "/api/dubbing/vi/dubbing-whisper",
    //   //     { inputPath: inputPath.trim() },
    //   //     { retryEnabled: false }
    //   //   );
    //   // } catch (error: unknown) {}
    // } else if (!inputPath.trim()) {
    //   console.log("input: ", inputPath);

    //   try {
    //     // Gọi API Java (Spring Boot)
    //     const response = await api.post(
    //       "/api/dubbing/vi/dubbing-whisper",
    //       { inputPath: inputPath.trim() },
    //       { retryEnabled: false }
    //     );
    //   } catch (error: unknown) {}
    // }
  };

  const handleProcessMakeAudio = async () => {
    if (makeAudioPath.trim()) {
      try {
        // Gọi API Java (Spring Boot)
        const response = await api.post(
          "/api/dubbing/vi/generate-dubbing-audio",
          { inputPath: makeAudioPath.trim() },
          { retryEnabled: false }
        );
      } catch (error: unknown) {}
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-cyan-400">Whisper Tool</h1>

        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={inputPath}
              disabled={!!selectedFile} // Disable nếu đang chọn file
              onChange={(e) => setInputPath(e.target.value)}
              placeholder={
                selectedFile
                  ? "Đang dùng chế độ chọn file..."
                  : "D:\\Dubbing\\pmh_vocals.wav"
              }
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleProcess}
            disabled={status === "loading"}
            className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02] ${
              status === "loading"
                ? "bg-slate-600 cursor-not-allowed text-slate-400"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30"
            }`}
          >
            {status === "loading" ? "Đang xử lý..." : "Bắt đầu xử lý"}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm"></div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-cyan-400">
          Make Audio Tool
        </h1>

        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={makeAudioPath}
              disabled={!!selectedFile} // Disable nếu đang chọn file
              onChange={(e) => setMakeAudioPath(e.target.value)}
              placeholder={
                selectedFile
                  ? "Đang dùng chế độ chọn file..."
                  : "D:\\Dubbing\\pmh_vi.srt"
              }
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleProcessMakeAudio}
            disabled={status === "loading"}
            className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02] ${
              status === "loading"
                ? "bg-slate-600 cursor-not-allowed text-slate-400"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30"
            }`}
          >
            {status === "loading" ? "Đang xử lý..." : "Bắt đầu xử lý"}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm"></div>
          </div>
        </div>

        {/* Thông báo kết quả */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              status === "success"
                ? "bg-green-900/20 border-green-500/50 text-green-400"
                : status === "error"
                ? "bg-red-900/20 border-red-500/50 text-red-400"
                : "bg-slate-700/50 border-slate-600 text-slate-300"
            }`}
          >
            <p className="font-mono text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default DubbingPage;
