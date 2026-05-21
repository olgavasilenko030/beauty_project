import React, { useEffect, useState } from "react";
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Upload,
  Avatar,
  Tag,
  Spin,
  Space,
} from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  UserOutlined,
  PlusOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const baseUrl = "https://localhost:7164";

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`${baseUrl}/api/Auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        // Мапим данные с сервера (PascalCase) на форму (camelCase)
        form.setFieldsValue({
          name: res.data.name,
          surname: res.data.surname,
          phone: res.data.phone,
          email: res.data.email,
          role: res.data.role,
        });

        if (res.data.avatarUrl) {
          setAvatarUrl(`${baseUrl}${res.data.avatarUrl}`);
        }
        setLoading(false);
      })
      .catch(() => {
        message.error("Ошибка загрузки профиля");
        setLoading(false);
      });
  }, [token, navigate, form]);

  const handleUpload = (info: any) => {
    if (info.file.status === "uploading") {
      setLoadingAvatar(true);
      return;
    }
    if (info.file.status === "done") {
      const serverPath = info.file.response.url;
      setAvatarUrl(`${baseUrl}${serverPath}`);
      setLoadingAvatar(false);
      message.success("Фото профиля сохранено");
    } else if (info.file.status === "error") {
      setLoadingAvatar(false);
      message.error("Ошибка загрузки файла");
    }
  };

  const onFinish = async (values: any) => {
    try {
      // ПРЕОБРАЗУЕМ В PASCALCASE ДЛЯ C# DTO
      const dataToSend = {
        Name: values.name,
        Surname: values.surname,
        Phone: values.phone,
        Email: form.getFieldValue("email"),
        Role: form.getFieldValue("role"),
      };

      await axios.put(`${baseUrl}/api/Auth/profile`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Данные успешно обновлены");
    } catch (error: any) {
      // Выводим детальную ошибку в консоль F12 для отладки
      console.error("Ошибка сохранения:", error.response?.data);
      message.error(error.response?.data || "Ошибка при сохранении");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <Spin size="large" tip="Загрузка профиля..." />
      </div>
    );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 2px 8px #f0f1f2",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginRight: 16 }}
        >
          Назад
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Настройки профиля
        </Title>
      </Header>

      <Content
        style={{ padding: "40px", display: "flex", justifyContent: "center" }}
      >
        <Card style={{ width: 450, textAlign: "center", borderRadius: 12 }}>
          <Upload
            name="file"
            listType="picture-circle"
            className="avatar-uploader"
            showUploadList={false}
            action={`${baseUrl}/api/Auth/upload-avatar`}
            headers={{ Authorization: `Bearer ${token}` }}
            onChange={handleUpload}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                style={{
                  width: "100%",
                  borderRadius: "50%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div>
                {loadingAvatar ? <LoadingOutlined /> : <PlusOutlined />}
                <div style={{ marginTop: 8 }}>Фото</div>
              </div>
            )}
          </Upload>

          <div style={{ margin: "20px 0" }}>
            <Space direction="vertical">
              <Tag color="gold" style={{ fontSize: "14px" }}>
                {form.getFieldValue("role")?.toUpperCase()}
              </Tag>
              <Text type="secondary">{form.getFieldValue("email")}</Text>
            </Space>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="name"
              label="Имя"
              rules={[{ required: true, message: "Введите имя" }]}
            >
              <Input size="large" placeholder="Ваше имя" />
            </Form.Item>
            <Form.Item name="surname" label="Фамилия">
              <Input size="large" placeholder="Ваша фамилия" />
            </Form.Item>
            {form.getFieldValue("role") === "Master" && (
              <Form.Item name="phone" label="Телефон">
                <Input size="large" placeholder="+7 (___) ___-__-__" />
              </Form.Item>
            )}
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<SaveOutlined />}
              style={{
                background: "#faad14",
                border: "none",
                marginTop: 10,
                height: 45,
              }}
            >
              Сохранить изменения
            </Button>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
