import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Layout,
  Tabs,
  Radio,
  Modal,
  Typography,
} from "antd"; // ДОБАВИЛИ: Modal и Typography в общий импорт
import { UserOutlined, LockOutlined, ShopOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

// ИСПРАВЛЕНО: Извлекаем текстовый компонент Paragraph из Typography
const { Paragraph } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, откуда пришел пользователь (по умолчанию Client, если зашли по прямой ссылке)
  const targetRole = location.state?.targetRole || "Client";

  const [role, setRole] = useState("Client");
  const [activeTab, setActiveTab] = useState("login");
  const [regForm] = Form.useForm();

  // ==========================================
  // ДОБАВЛЕНО: Стейты и формы для восстановления паролей пользователей
  // ==========================================
  const [isResetModalOpen, setIsResetModalOpen] = useState(false); // Видимость модалки сброса
  const [resetStep, setResetStep] = useState(1); // 1 - ввод Email, 2 - ввод кода и нового пароля
  const [resetEmail, setResetEmail] = useState(""); // Сохраняем email для второго шага
  const [loadingReset, setLoadingReset] = useState(false); // Лоадер отправки сетевых запросов

  const [emailForm] = Form.useForm(); // Форма Шага 1
  const [passwordResetForm] = Form.useForm(); // Форма Шага 2

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
        // ==========================================
        // ИСПРАВЛЕНО: Умный подхват выбранного мастера после авторизации клиента
        // ==========================================
        const autoBusinessId = sessionStorage.getItem("autoBusinessId");
        const autoMasterId = sessionStorage.getItem("autoMasterId");

        if (autoBusinessId && autoMasterId) {
          // Очищаем временную сессию, чтобы авто-открытие сработало строго один раз
          sessionStorage.removeItem("autoBusinessId");
          sessionStorage.removeItem("autoMasterId");

          // Перенаправляем в ЛК, прокидывая ID мастера во внутреннее состояние роутера
          navigate("/client", {
            state: {
              autoBusinessId: parseInt(autoBusinessId, 10),
              autoMasterId: parseInt(autoMasterId, 10),
            },
          });
        } else {
          // Обычный вход без предварительного выбора мастера
          navigate("/client");
        }
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
  // ==========================================
  // ДОБАВЛЕНО: Функции сетевых запросов восстановления доступа
  // ==========================================

  // ОБНОВЛЕНО: Запрос токенизированной бьюти-ссылки на Email
  const handleSendResetCode = async (values: any) => {
    setLoadingReset(true);
    try {
      const emailValue = values.resetEmail.toLowerCase().trim();
      const res = await axios.post(`${baseUrl}/api/Auth/forgot-password`, {
        email: emailValue,
      });

      message.success(
        res.data.message ||
          "Ссылка для восстановления доступа отправлена на вашу почту!",
      );

      // ИСПРАВЛЕНО: Закрываем модалку сразу, так как код вводить больше не нужно!
      setIsResetModalOpen(false);
      emailForm.resetFields();
    } catch (err: any) {
      message.error(
        err.response?.data ||
          "Не удалось отправить ссылку восстановления. Проверьте Email.",
      );
    } finally {
      setLoadingReset(false);
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
          {/* ДОБАВЛЕНО: Кнопка-ссылка вызова системы восстановления доступа */}
          <div
            style={{
              textAlign: "right",
              marginBottom: "15px",
              marginTop: "-10px",
            }}
          >
            <Button
              type="link"
              onClick={() => {
                setResetStep(1);
                setIsResetModalOpen(true);
              }}
              style={{
                color: "#faad14",
                padding: 0,
                fontWeight: 500,
                fontSize: "13px",
              }}
            >
              Забыли пароль?
            </Button>
          </div>
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
      {/* ==========================================
          ОБНОВЛЕНО: Лаконичное модальное окно запроса ссылки Ant Design
          ========================================== */}
      <Modal
        title="🔒 Восстановление доступа"
        open={isResetModalOpen}
        onCancel={() => {
          setIsResetModalOpen(false);
          emailForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={400}
        centered
      >
        <Form
          form={emailForm}
          onFinish={handleSendResetCode}
          layout="vertical"
          style={{ marginTop: 15 }}
        >
          <Paragraph
            style={{ color: "#64748b", fontSize: "13px", marginBottom: 20 }}
          >
            Введите ваш Email. Если аккаунт существует, мы мгновенно отправим на
            него сочную интерактивную ссылку для безопасного сброса пароля без
            ввода лишних кодов.
          </Paragraph>
          <Form.Item
            name="resetEmail"
            rules={[
              {
                required: true,
                type: "email",
                message: "Введите корректный Email",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Ваш регистрационный Email"
              size="large"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loadingReset}
            style={{
              background: "#faad14",
              border: "none",
              marginTop: 10,
              fontWeight: 600,
            }}
          >
            Получить ссылку для сброса
          </Button>
        </Form>
      </Modal>
    </Layout>
  );
}
