import React, { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Button,
  Row,
  Col,
  Card,
  Tag,
  message,
  Modal,
  Form,
  Select,
  DatePicker,
  Tabs,
  Space,
  Table,
  Avatar,
} from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { confirm } = Modal;

interface Master {
  id: number;
  name: string;
  surname?: string;
  jobTitle?: string;
  avatarUrl?: string; // Поле для хранения аватарки мастера
  portfolioPhotos?: string[]; // Поле для хранения массива фото работ
}

export default function ClientPage() {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form] = Form.useForm();

  const token = localStorage.getItem("token");
  const linkedId = localStorage.getItem("linkedId");
  const baseUrl = "https://localhost:7164";

  const formServiceId = Form.useWatch("serviceId", form);
  const formDate = Form.useWatch("date", form);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`${baseUrl}/api/Employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMasters(res.data))
      .catch(() => message.error("Не удалось загрузить список мастеров"));
  }, [navigate, token]);

  useEffect(() => {
    if (selectedMaster && formServiceId && formDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);

      const formattedDate = (formDate as Dayjs).format("YYYY-MM-DD");

      axios
        .get(
          `${baseUrl}/api/Recordings/slots?masterId=${selectedMaster.id}&serviceId=${formServiceId}&date=${formattedDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .then((res) => {
          setAvailableSlots(res.data);
        })
        .catch(() => message.error("Ошибка при генерации свободного времени"))
        .finally(() => setLoadingSlots(false));
    } else {
      setAvailableSlots([]);
    }
  }, [formServiceId, formDate, selectedMaster, token]);

  const fetchMyRecordings = () => {
    setLoadingRecordings(true);
    axios
      .get(`${baseUrl}/api/Recordings/ForClient/${linkedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMyRecordings(res.data))
      .catch(() => message.error("Ошибка при загрузке записей"))
      .finally(() => setLoadingRecordings(false));
  };

  const handleCancel = (id: number) => {
    confirm({
      title: "Вы уверены, что хотите отменить запись?",
      icon: <ExclamationCircleOutlined />,
      okText: "Да, отменить",
      okType: "danger",
      cancelText: "Нет",
      onOk: async () => {
        try {
          await axios.patch(
            `${baseUrl}/api/Recordings/Cancel/${id}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          message.success("Запись отменена");
          fetchMyRecordings();
        } catch {
          message.error("Не удалось отменить запись");
        }
      },
    });
  };

  const openBooking = (master: Master) => {
    setSelectedMaster(master);
    setServices([]);
    setAvailableSlots([]);
    setSelectedSlot(null);
    form.resetFields();

    axios
      .get(`${baseUrl}/api/Services?employeeId=${master.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setServices(res.data);
        setIsModalOpen(true);
      })
      .catch(() => message.error("Не удалось загрузить услуги мастера"));
  };

  const onFinish = async (values: any) => {
    if (!selectedSlot) {
      message.error("Пожалуйста, выберите время визита!");
      return;
    }

    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const combinedDateTime = (values.date as Dayjs)
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);

    const payload = {
      AppointmentTime: combinedDateTime.format(),
      EmploeeId: selectedMaster?.id,
      ServiceId: values.serviceId,
      ClientId: parseInt(linkedId || "0"),
      Status: "Scheduled",
    };

    try {
      await axios.post(`${baseUrl}/api/Recordings`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Вы успешно записаны!");
      setIsModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data || "Ошибка при создании записи");
    }
  };

  const recordingColumns = [
    {
      title: "Дата и время",
      dataIndex: "appointmentTime",
      key: "date",
      render: (t: any) =>
        new Date(t).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Мастер",
      key: "master",
      render: (_: any, record: any) => (
        <span>{record.emploee?.name || "Мастер"}</span>
      ),
    },
    {
      title: "Услуга",
      key: "service",
      render: (_: any, record: any) => (
        <Tag color="blue">{record.service?.name}</Tag>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag
          color={
            status === "Cancelled"
              ? "red"
              : status === "Completed"
                ? "green"
                : "blue"
          }
        >
          {status === "Scheduled"
            ? "Ожидается"
            : status === "Cancelled"
              ? "Отменена"
              : "Выполнено"}
        </Tag>
      ),
    },
    {
      title: "Действие",
      key: "action",
      render: (_: any, record: any) =>
        record.status === "Scheduled" && (
          <Button type="link" danger onClick={() => handleCancel(record.id)}>
            Отменить
          </Button>
        ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 40px",
        }}
      >
        <Title
          level={4}
          style={{ margin: 0, color: "#faad14", cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          BEAUTY HUB
        </Title>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => navigate("/settings")}
          >
            Профиль
          </Button>
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
          >
            Выход
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: "40px" }}>
        <Tabs
          defaultActiveKey="1"
          onChange={(key) => key === "2" && fetchMyRecordings()}
        >
          <Tabs.TabPane
            tab={
              <span>
                <UserOutlined />
                Мастера
              </span>
            }
            key="1"
          >
            <Row gutter={[16, 16]} style={{ marginTop: "15px" }}>
              {masters.map((m) => (
                <Col xs={24} sm={12} md={8} key={m.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 16,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                      textAlign: "center",
                    }}
                  >
                    {/* Фото мастера со склейкой путей */}
                    <div style={{ marginBottom: 15 }}>
                      <Avatar
                        size={100}
                        src={
                          m.avatarUrl
                            ? `${baseUrl}${m.avatarUrl.startsWith("/") ? m.avatarUrl : "/" + m.avatarUrl}`
                            : undefined
                        }
                        icon={!m.avatarUrl && <UserOutlined />}
                        style={{
                          backgroundColor: "#faad14",
                          border: "3px solid #fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                    </div>

                    {/* Данные мастера */}
                    <Title level={4} style={{ margin: "0 0 4px 0" }}>
                      {m.name} {m.surname || ""}
                    </Title>
                    <div style={{ marginBottom: 20 }}>
                      <Tag
                        color="gold"
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {m.jobTitle || "Специалист"}
                      </Tag>
                    </div>

                    {/* Примеры работ (Плитка портфолио) */}
                    <div style={{ textAlign: "left", marginBottom: 20 }}>
                      <Text
                        type="secondary"
                        strong
                        style={{
                          display: "block",
                          marginBottom: 8,
                          fontSize: 12,
                        }}
                      >
                        <PictureOutlined /> Примеры работ:
                      </Text>
                      {m.portfolioPhotos && m.portfolioPhotos.length > 0 ? (
                        <Row gutter={[8, 8]}>
                          {m.portfolioPhotos.slice(0, 4).map((url, index) => (
                            <Col span={6} key={index}>
                              <div
                                style={{
                                  width: "100%",
                                  height: "60px",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                  background: "#f5f5f5",
                                }}
                              >
                                <img
                                  src={`${baseUrl}${url.startsWith("/") ? url : "/" + url}`}
                                  alt="work-preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <div
                          style={{
                            background: "#f5f5f5",
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 11,
                            color: "#bfbfbf",
                            textAlign: "center",
                          }}
                        >
                          Мастер ещё не добавил примеры работ
                        </div>
                      )}
                    </div>

                    {/* ИСПРАВЛЕНО: Текст кнопки изменен строго на «Записаться» */}
                    <Button
                      type="primary"
                      block
                      size="large"
                      onClick={() => openBooking(m)}
                      style={{
                        background: "#faad14",
                        borderColor: "#faad14",
                        borderRadius: 8,
                        fontWeight: "bold",
                        height: 42,
                      }}
                    >
                      Записаться
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <span>
                <CalendarOutlined />
                Мои записи
              </span>
            }
            key="2"
          >
            <Table
              dataSource={myRecordings}
              columns={recordingColumns}
              rowKey="id"
              loading={loadingRecordings}
              style={{ marginTop: "15px" }}
              pagination={{ pageSize: 6 }}
            />
          </Tabs.TabPane>
        </Tabs>

        <Modal
          title={`Онлайн-запись к специалисту: ${selectedMaster?.name}`}
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => setIsModalOpen(false)}
          okText="Подтвердить бронь"
          cancelText="Назад"
          okButtonProps={{
            disabled: !selectedSlot,
            style: { background: "#faad14", borderColor: "#faad14" },
          }}
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="serviceId"
              label="1. Выберите услугу"
              rules={[{ required: true, message: "Выберите услугу" }]}
            >
              <Select placeholder="Доступные процедуры мастера">
                {services.map((s: any) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name} — {s.price} ₽
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="date"
              label="2. Выберите дату визита"
              rules={[{ required: true, message: "Укажите дату" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>

            {formServiceId && formDate && (
              <div style={{ marginTop: "20px" }}>
                <Text strong style={{ display: "block", marginBottom: "10px" }}>
                  3. Доступное время сеанса:
                </Text>
                {loadingSlots ? (
                  <Text type="secondary">Расчет свободных окон мастера...</Text>
                ) : availableSlots.length === 0 ? (
                  <Text type="danger" strong>
                    Свободных мест на эту дату нет. Выберите другой день.
                  </Text>
                ) : (
                  <Row gutter={[8, 8]}>
                    {availableSlots.map((slot) => (
                      <Col span={6} key={slot}>
                        <Button
                          type={selectedSlot === slot ? "primary" : "default"}
                          block
                          style={{
                            borderRadius: "6px",
                            borderColor:
                              selectedSlot === slot ? "#faad14" : "#d9d9d9",
                            background:
                              selectedSlot === slot ? "#faad14" : "#fff",
                            color: selectedSlot === slot ? "#fff" : "#000",
                          }}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            )}
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
