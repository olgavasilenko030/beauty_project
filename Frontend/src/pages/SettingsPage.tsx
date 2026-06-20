import React, { useEffect, useState } from "react";
import {
  Layout,
  Card,
  Typography,
  Form,
  Input,
  Button,
  Radio,
  DatePicker,
  message,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const linkedId = localStorage.getItem("linkedId");
  const baseUrl = "https://localhost:7164";

  // 1. Метод загрузки текущих данных анкеты клиента с бэкенда
  const fetchClientProfile = async () => {
    if (!token || !linkedId) return;
    try {
      const res = await axios.get(`${baseUrl}/api/Clients/${linkedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Заполняем форму Ant Design прилетевшими из PostgreSQL данными
      form.setFieldsValue({
        name: res.data.name,
        surname: res.data.surname,
        phone: res.data.notes === "Контакты" ? "" : res.data.notes,
        gender: res.data.gender,
        dateOfBirth: res.data.dateOfBirth ? dayjs(res.data.dateOfBirth) : null,
        sourceOfAttraction: res.data.sourceOfAttraction,
      });
    } catch (err) {
      message.error("Не удалось загрузить данные вашего профиля");
    }
  };

  useEffect(() => {
    fetchClientProfile();
  }, []);

  // 2. Метод отправки обновленной анкеты на бэкенд C# с PascalCase свойствами
  const handleUpdateProfileSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        Id: parseInt(linkedId || "0", 10),
        Name: values.name,
        Surname: values.surname || "CRM",
        Notes: values.phone || "Контакты",
        DateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
        Gender: values.gender,
        SourceOfAttraction: values.sourceOfAttraction,
        IsBlocked: false,
        Discount: 0,
      };

      await axios.put(`${baseUrl}/api/Clients/${linkedId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Данные вашего профиля успешно сохранены!");
      navigate("/client"); // После сохранения вежливо возвращаем в Личный кабинет
    } catch (err: any) {
      message.error(
        err.response?.data || "Не удалось сохранить изменения профиля",
      );
    } finally {
      setLoading(false);
    }
  };

  // 3. Посимвольная маска номера телефона для защиты базы от букв
  const handleClientPhoneChange = (e: any) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.substring(0, 11);
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

  return (
    <Layout style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 30px",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <Space size={14}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/client")}
            style={{ borderRadius: "8px" }}
          >
            Назад в кабинет
          </Button>
          <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
            ⚙️ Настройки личного профиля
          </Title>
        </Space>
      </Header>

      <Content
        style={{
          padding: "40px",
          maxWidth: 600,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Card
          style={{
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProfileSubmit}
          >
            <Form.Item
              name="name"
              label="Имя"
              rules={[
                { required: true, message: "Пожалуйста, введите ваше имя" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Ваше имя"
                size="large"
              />
            </Form.Item>

            <Form.Item name="surname" label="Фамилия">
              <Input placeholder="Ваша фамилия" size="large" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Номер телефона"
              rules={[{ required: true, message: "Введите номер телефона" }]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+7 (999) 000-00-00"
                size="large"
                onChange={handleClientPhoneChange}
              />
            </Form.Item>

            <Form.Item name="gender" label="Ваш пол" initialValue="Женский">
              <Radio.Group size="large">
                <Radio value="Мужской">Мужской</Radio>
                <Radio value="Женский">Женский</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="dateOfBirth" label="Дата рождения">
              <DatePicker
                style={{ width: "100%" }}
                size="large"
                format="DD.MM.YYYY"
              />
            </Form.Item>

            <Form.Item
              name="sourceOfAttraction"
              label="Откуда вы узнали о нас?"
            >
              <Input
                placeholder="Например: Инстаграм, Друзья, Реклама"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              icon={<SaveOutlined />}
              style={{
                background: "#faad14",
                borderColor: "#faad14",
                fontWeight: 700,
                marginTop: 10,
                height: 45,
                borderRadius: "8px",
              }}
            >
              Сохранить изменения профиля
            </Button>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
