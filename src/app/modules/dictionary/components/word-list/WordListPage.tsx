"use client";
import { Button } from "antd";
import React from "react";
import { AntDesignOutlined } from "@ant-design/icons";
import { api } from "@/app/lib/apiClient";

const WordListPage: React.FC = () => {
  const handleClick = async () => {
    const patients = await api.post<{ items: unknown[]; total: number }>(
      "/api/work-audio/build"
    );
    console.log(patients);
  };
  return (
    <div>
      <Button
        type="primary"
        size="large"
        icon={<AntDesignOutlined />}
        onClick={handleClick}
      >
        Action
      </Button>
    </div>
  );
};
export default WordListPage;
