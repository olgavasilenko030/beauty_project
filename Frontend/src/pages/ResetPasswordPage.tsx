import React, { useState } from "react";
import { Form, Input, Button, Card, message, Layout, Typography } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Автоматически вытаскиваем зашифрованный token из ссылки браузера
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const baseUrl = "https://localhost:7164";

  const onResetPassword = async (values: any) => {
    if (!token) {
      message.error("Токен восстановления отсутствует или недействителен.");
      return;
    }

    setLoading(true); // ИСПРАВЛЕНО: Вызываем хук как функцию!
    try {
      const payload = {
        token: token,
        newPassword: values.newPassword,
      };

      await axios.post(`${baseUrl}/api/Auth/reset-password-via-link`, payload);
      setIsSuccess(true);
      message.success("Пароль успешно изменен!");
    } catch (err: any) {
      message.error(
        err.response?.data || "Ошибка сброса. Возможно, ссылка устарела.",
      );
    } finally {
      setLoading(false); // ИСПРАВЛЕНО: Вызываем хук как функцию!
    }
  };

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
          width: 420,
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Title
            level={3}
            style={{ color: "#faad14", margin: 0, fontWeight: 800 }}
          >
            BEAUTY HUB
          </Title>
        </div>

        {!isSuccess ? (
          <Form onFinish={onResetPassword} layout="vertical">
            <Paragraph
              style={{ color: "#64748b", fontSize: "13px", marginBottom: 20 }}
            >
              Придумайте новый надежный пароль для вашей учетной записи. Он
              должен содержать не менее 5 символов.
            </Paragraph>

            <Form.Item
              name="newPassword"
              label="Новый пароль"
              rules={[
                { required: true, min: 5, message: "Минимум 5 символов" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Введите новый пароль"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Повторите новый пароль"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Повторите пароль" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Пароли не совпадают!"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Повторите пароль"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                background: "#faad14",
                border: "none",
                marginTop: 10,
                fontWeight: 600,
              }}
            >
              Обновить пароль
            </Button>
          </Form>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircleOutlined
              style={{ fontSize: "56px", color: "#52c41a", marginBottom: 15 }}
            />
            <Title level={4} style={{ margin: 0, color: "#1f1f1f" }}>
              Доступ восстановлен!
            </Title>
            <Paragraph
              style={{ color: "#64748b", marginTop: 8, fontSize: "14px" }}
            >
              Ваш новый пароль успешно сохранен в базе данных CRM.
            </Paragraph>
            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate("/login")}
              style={{
                background: "#faad14",
                border: "none",
                marginTop: 20,
                fontWeight: 600,
              }}
            >
              Перейти к входу
            </Button>
          </div>
        )}
      </Card>
    </Layout>
  );
}
