import { Button, ConfigProvider, Space } from "antd";
import React from "react";
import { AntDesignOutlined } from "@ant-design/icons";

const WordListPage: React.FC = () => {
  return (
    <div>
      <Button type="primary" size="large" icon={<AntDesignOutlined />}>
        Action
      </Button>
    </div>
  );
};
export default WordListPage;
