import React, { useState } from "react";
import { Upload, Modal, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export default function PortfolioUpload({ targetId, type }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [fileList, setFileList] = useState([]);

  const baseUrl = "https://localhost:7164";
  const token = localStorage.getItem("token");

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    setPreviewImage(file.url || file.thumbUrl);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf("/") + 1),
    );
  };

  const handleChange = ({ fileList: newFileList }) => {
    // Обновляем стейт файлов (Ant Design сам переведет в status: 'done', если бэкенд вернет 200)
    setFileList(newFileList);
  };

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("Вы можете загружать только файлы JPG/PNG!");
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Размер фотографии не должен превышать 5MB!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  return (
    <div style={{ marginTop: "15px" }}>
      <Upload
        action={`${baseUrl}/api/Auth/upload-portfolio?targetId=${targetId}&type=${type}`}
        headers={{ Authorization: `Bearer ${token}` }}
        name="file"
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={beforeUpload}
      >
        {fileList.length >= 8 ? null : (
          <div>
            <PlusOutlined style={{ color: "#faad14", fontSize: "20px" }} />
            <div style={{ marginTop: 8, fontWeight: 500 }}>Добавить фото</div>
          </div>
        )}
      </Upload>
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
      >
        <img
          alt="preview"
          style={{ width: "100%", borderRadius: "8px" }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
}
