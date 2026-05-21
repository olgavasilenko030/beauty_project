import React, { useState } from "react";
import { Form, Input, Button, Card, message, Layout, Tabs, Radio } from "antd";
import { UserOutlined, LockOutlined, ShopOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, откуда пришел пользователь (по умолчанию Client, если зашли по прямой ссылке)
  const targetRole = location.state?.targetRole || "Client";

  const [role, setRole] = useState("Client");
  const [activeTab, setActiveTab] = useState("login");
  const [regForm] = Form.useForm();

  const baseUrl = "https://localhost:7164";

  const onLogin = async (values: any) => {
    try {
      const payload = {
        email: values.email.toLowerCase(),
        password: values.password,
      };

      const res = await axios.post(`${baseUrl}/api/Auth/login`, payload);
      const userRole = res.data.role;

      // СТРОГАЯ ПРОВЕРКА РОЛИ В ЗАВИСИМОСТИ ОТ ВЫБРАННОЙ ВКЛАДКИ НА ГЛАВНОЙ
      if (targetRole === "Business" && userRole === "Client") {
        message.error(
          "Эта форма предназначена только для бизнеса (салонов и мастеров)!",
        );
        return;
      }

      if (targetRole === "Client" && userRole !== "Client") {
        message.error(
          "Сотрудники и владельцы бизнеса должны авторизоваться через панель 'Вход для бизнеса'!",
        );
        return;
      }

      // Если проверка пройдена, сохраняем сессию
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("businessId", res.data.businessId || "0");
      localStorage.setItem("linkedId", res.data.linkedId || "0");

      message.success("Успешный вход в систему!");

      // Перенаправление по кабинетам
      if (userRole === "Owner" || userRole === "Admin") {
        navigate("/admin");
      } else if (userRole === "Master") {
        navigate("/master");
      } else {
        navigate("/client");
      }
    } catch (err) {
      message.error("Ошибка входа. Проверьте ваш логин и пароль.");
    }
  };

  const onRegister = async (values: any) => {
    try {
      const payload = {
        email: values.email.toLowerCase(),
        password: values.password,
        role: role,
        businessName: values.businessName || "",
      };

      await axios.post(`${baseUrl}/api/Auth/register`, payload);
      message.success("Регистрация завершена! Пожалуйста, войдите в аккаунт.");

      regForm.resetFields();
      setActiveTab("login");
    } catch (err: any) {
      message.error(err.response?.data || "Ошибка при регистрации аккаунта.");
    }
  };

  const items = [
    {
      key: "login",
      label: `Вход (${targetRole === "Business" ? "Для бизнеса" : "Для клиентов"})`,
      children: (
        <Form onFinish={onLogin} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              {
                required: true,
                type: "email",
                message: "Введите корректный Email",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Ваш Email"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Введите пароль" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Пароль"
              size="large"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            style={{ background: "#faad14", border: "none", marginTop: 10 }}
          >
            Войти в личный кабинет
          </Button>
        </Form>
      ),
    },
    {
      key: "reg",
      label: "Регистрация нового аккаунта",
      children: (
        <Form form={regForm} onFinish={onRegister} layout="vertical">
          <Form.Item label="Кто вы в системе?">
            <Radio.Group
              onChange={(e) => setRole(e.target.value)}
              value={role}
              buttonStyle="solid"
              style={{ width: "100%", display: "flex" }}
            >
              <Radio.Button
                value="Client"
                style={{ flex: 1, textAlign: "center" }}
              >
                Я клиент
              </Radio.Button>
              <Radio.Button
                value="Owner"
                style={{ flex: 1, textAlign: "center" }}
              >
                Я бизнес (Салон)
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, type: "email", message: "Введите Email" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Электронная почта"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, min: 5, message: "Минимум 5 символов" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Придумайте пароль"
              size="large"
            />
          </Form.Item>
          {role === "Owner" && (
            <Form.Item
              name="businessName"
              rules={[
                { required: true, message: "Укажите название вашего бизнеса" },
              ]}
            >
              <Input
                prefix={<ShopOutlined />}
                placeholder="Название салона / студии"
                size="large"
              />
            </Form.Item>
          )}
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            style={{ background: "#52c41a", border: "none", marginTop: 10 }}
          >
            Создать учетную запись
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        style={{
          width: 440,
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
        title={
          <div
            style={{
              textAlign: "center",
              color: "#faad14",
              fontSize: "20px",
              fontWeight: "bold",
              letterSpacing: "1px",
            }}
          >
            BEAUTY HUB
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={items}
          centered
        />
      </Card>
    </Layout>
  );
}
