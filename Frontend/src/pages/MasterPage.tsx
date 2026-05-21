import React, { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Button,
  Tag,
  message,
  Space,
  Card,
  Calendar,
  Badge,
  Modal,
  List,
  Popconfirm,
  Avatar,
} from "antd";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LogoutOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Строгая типизация сущностей для TypeScript
interface Client {
  name: string;
  surname?: string;
}

interface Service {
  name: string;
  price: number;
}

interface Recording {
  id: number;
  appointmentTime: string;
  status: "Scheduled" | "Completed" | "Cancelled" | string;
  client?: Client;
  service?: Service;
}

export default function MasterPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояния для модального окна просмотра записей конкретного дня
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateRecordings, setSelectedDateRecordings] = useState<
    Recording[]
  >([]);
  const [selectedDateStr, setSelectedDateStr] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const masterId = localStorage.getItem("linkedId");
  const baseUrl = "https://localhost:7164";

  const fetchSchedule = () => {
    setLoading(true);
    axios
      .get(`${baseUrl}/api/Recordings/ForMaster/${masterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setRecordings(res.data))
      .catch(() => message.error("Ошибка загрузки расписания"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token || localStorage.getItem("role") !== "Master") {
      navigate("/login");
      return;
    }
    fetchSchedule();
  }, [navigate, masterId, token]);

  const handleComplete = async (id: number) => {
    try {
      await axios.patch(
        `${baseUrl}/api/Recordings/Complete/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success("Визит успешно завершен!");
      fetchSchedule(); // Обновляем данные с сервера
      setIsModalOpen(false); // Закрываем модалку
    } catch {
      message.error("Не удалось изменить статус записи");
    }
  };

  // Получение записей на конкретный день для рендеринга в ячейку
  const getDayRecordings = (value: Dayjs) => {
    const formattedDate = value.format("YYYY-MM-DD");
    return recordings.filter((r) => {
      const recDate = new Date(r.appointmentTime).toISOString().split("T")[0];
      return recDate === formattedDate;
    });
  };

  // Функция отрисовки контента внутри ячеек дней календаря
  const dateCellRender = (value: Dayjs) => {
    const dayData = getDayRecordings(value);
    return (
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0, overflow: "hidden" }}
      >
        {dayData.map((item) => {
          let badgeStatus: "success" | "error" | "processing" = "processing";
          if (item.status === "Cancelled") badgeStatus = "error";
          if (item.status === "Completed") badgeStatus = "success";

          const timeStr = new Date(item.appointmentTime).toLocaleTimeString(
            "ru-RU",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          return (
            <li
              key={item.id}
              style={{
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              <Badge
                status={badgeStatus}
                text={`${timeStr} ${item.service?.name || "Услуга"}`}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  // Клик по ячейке дня — открывает модальное окно со списком сеансов
  const onSelectDate = (value: Dayjs) => {
    const dayData = getDayRecordings(value);
    setSelectedDateRecordings(dayData);
    setSelectedDateStr(value.format("DD.MM.YYYY"));
    setIsModalOpen(true);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          height: "70px",
        }}
      >
        <Space size="middle">
          <CalendarOutlined style={{ fontSize: "22px", color: "#faad14" }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            BEAUTY HUB: Календарь Мастера
          </Title>
        </Space>
        <Space size="middle">
          <Button
            icon={<SettingOutlined />}
            size="large"
            onClick={() => navigate("/settings")}
          >
            Настройки
          </Button>
          <Button
            icon={<LogoutOutlined />}
            danger
            type="primary"
            size="large"
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
          >
            Выйти
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: "40px" }}>
        <Card
          style={{
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          }}
          bodyStyle={{ padding: "20px" }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px" }}>
              <Text>Загрузка календаря...</Text>
            </div>
          ) : (
            <Calendar dateCellRender={dateCellRender} onSelect={onSelectDate} />
          )}
        </Card>

        {/* МОДАЛЬНОЕ ОКНО: Список записей на выбранный день */}
        <Modal
          title={`Записи на день: ${selectedDateStr}`}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={600}
        >
          <List
            itemLayout="horizontal"
            dataSource={selectedDateRecordings}
            locale={{ emptyText: "На этот день записей нет" }}
            renderItem={(item) => {
              const itemTime = new Date(
                item.appointmentTime,
              ).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <List.Item
                  actions={[
                    item.status === "Scheduled" && (
                      <Popconfirm
                        title="Подтверждаете выполнение услуги?"
                        onConfirm={() => handleComplete(item.id)}
                        okText="Да"
                        cancelText="Нет"
                        okButtonProps={{
                          style: {
                            background: "#52c41a",
                            borderColor: "#52c41a",
                          },
                        }}
                      >
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          style={{
                            background: "#52c41a",
                            borderColor: "#52c41a",
                          }}
                        >
                          Завершить
                        </Button>
                      </Popconfirm>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<ClockCircleOutlined />}
                        style={{ background: "#faad14" }}
                      />
                    }
                    title={
                      <Space>
                        <Text strong style={{ fontSize: "16px" }}>
                          {itemTime}
                        </Text>
                        <Text
                          style={{ fontSize: "16px" }}
                        >{`${item.client?.name || "Клиент"} ${item.client?.surname || ""}`}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary">
                          Услуга: {item.service?.name}
                        </Text>
                        <Space>
                          <Tag
                            color={
                              item.status === "Cancelled"
                                ? "red"
                                : item.status === "Completed"
                                  ? "green"
                                  : "blue"
                            }
                          >
                            {item.status === "Scheduled"
                              ? "ОЖИДАЕТСЯ"
                              : item.status === "Cancelled"
                                ? "ОТМЕНЕНА"
                                : "ВЫПОЛНЕНО"}
                          </Tag>
                          <Text strong>{item.service?.price} ₽</Text>
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Modal>
      </Content>
    </Layout>
  );
}
