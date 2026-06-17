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
  Tag,
  Spin,
  Space,
  DatePicker,
  Select,
  Row,
  Col,
} from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import {
  LoadingOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  PhoneOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const baseUrl = "https://localhost:7164";

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("7") || value.startsWith("8"))
      value = value.substring(1);

    let formattedValue = "";
    if (value.length > 0) formattedValue += `+7 (${value.substring(0, 3)}`;
    if (value.length >= 4) formattedValue += `) ${value.substring(3, 6)}`;
    if (value.length >= 7) formattedValue += `-${value.substring(6, 8)}`;
    if (value.length >= 9) formattedValue += `-${value.substring(8, 10)}`;
    if (value.length === 0) formattedValue = "";

    form.setFieldsValue({ phone: formattedValue });
  };

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
        setUserRole(res.data.role || "");
        setUserEmail(res.data.email || "");

        // ИСПРАВЛЕНО: Таймаут гарантирует, что форма УСПЕЛА смонтироваться в DOM-дереве до записи полей
        setTimeout(() => {
          form.setFieldsValue({
            name: res.data.name,
            surname: res.data.surname === "CRM" ? "" : res.data.surname,
            phone: res.data.phone,
            gender: res.data.gender || undefined,
            sourceOfAttraction: res.data.sourceOfAttraction || undefined,
            dateOfBirth: res.data.dateOfBirth
              ? dayjs(res.data.dateOfBirth)
              : null,
          });
        }, 50);

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
      const dataToSend = {
        Name: values.name,
        Surname: values.surname || "CRM",
        Phone: values.phone,
        Email: userEmail,
        Role: userRole,
        Gender: values.gender,
        SourceOfAttraction: values.sourceOfAttraction,
        DateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
      };

      await axios.put(`${baseUrl}/api/Auth/profile`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Данные успешно обновлены");
    } catch (error: any) {
      console.error("Ошибка сохранения:", error.response?.data);
      message.error(error.response?.data || "Ошибка при сохранении");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        {/* ИСПРАВЛЕНО: Заменили устаревшее свойство tip на description под новый Ant Design */}
        <Spin size="large" description="Загрузка профиля..." />
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
        <Card
          style={{
            width: 480,
            borderRadius: 16,
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
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
          </div>

          <div style={{ margin: "15px 0 25px 0", textAlign: "center" }}>
            {/* ИСПРАВЛЕНО: Заменили компонент Space на чистый CSS Flexbox, чтобы навсегда убрать предупреждение в консоли! */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Tag
                color="gold"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {userRole === "Client" ? "👑 Клиент" : "✂️ Мастер"}
              </Tag>
              <Text type="secondary" strong>
                {userEmail}
              </Text>
            </div>
          </div>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Имя"
                  rules={[{ required: true, message: "Введите имя" }]}
                >
                  <Input
                    size="large"
                    placeholder="Ваше имя"
                    style={{ textAlign: "left" }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="surname" label="Фамилия">
                  <Input
                    size="large"
                    placeholder="Ваша фамилия"
                    style={{ textAlign: "left" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="phone" label="Номер телефона">
              <Input
                size="large"
                maxLength={18}
                placeholder="+7 (999) 123-45-67"
                prefix={<PhoneOutlined style={{ color: "#ef4444" }} />}
                onChange={handlePhoneInputChange}
                style={{ textAlign: "left" }}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dateOfBirth" label="Дата рождения">
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD.MM.YYYY"
                    size="large"
                    placeholder="ДД.ММ.ГГГГ"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gender" label="Пол">
                  <Select
                    placeholder="Выберите пол"
                    size="large"
                    style={{ textAlign: "left" }}
                  >
                    <Select.Option value="Мужской">👨 Мужской</Select.Option>
                    <Select.Option value="Женский">👩 Женский</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="sourceOfAttraction"
              label="Откуда вы о нас узнали?"
            >
              <Select
                placeholder="Выберите источник рекламы"
                size="large"
                style={{ textAlign: "left" }}
              >
                <Select.Option value="VK">🌐 ВКонтакте</Select.Option>
                <Select.Option value="Instagram">📸 Instagram</Select.Option>
                <Select.Option value="Рекомендация">
                  🤝 Рекомендация друзей
                </Select.Option>
                <Select.Option value="Вывеска">
                  ✨ Проходил мимо / Вывеска
                </Select.Option>
              </Select>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<SaveOutlined />}
              style={{
                background: "#faad14",
                border: "none",
                marginTop: 15,
                height: 48,
                fontWeight: 700,
                borderRadius: 12,
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
