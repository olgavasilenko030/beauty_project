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
  Image,
  Rate,
  Input,
} from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  ShopOutlined,
  AppstoreOutlined,
  CommentOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

interface Master {
  id: number;
  name: string;
  surname?: string;
  jobTitle?: string;
  avatarUrl?: string;
  businessId: number;
  portfolioPhotos?: string[];
}
interface Business {
  id: number;
  name: string;
  address: string;
  logoUrl?: string;
  phone?: string;
  description?: string;
  workingHours?: string;
  workingDays?: string[];
  socialLinks?: string;
  interiorPhotos?: string[];
}

const BASE_URL = "https://localhost:7164";
const categories = [
  { id: "all", name: "Все услуги", img: "https://unsplash.com" },
  {
    id: "hair",
    name: "Парикмахерские услуги",
    img: `${BASE_URL}/uploads/categories/hair.jpg`,
  },
  {
    id: "nails",
    name: "Ногтевой сервис",
    img: `${BASE_URL}/uploads/categories/nails.jpg`,
  },
  {
    id: "brows",
    name: "Ресницы & Брови",
    img: `${BASE_URL}/uploads/categories/brows.jpg`,
  },
  {
    id: "barber",
    name: "Барбершоп",
    img: `${BASE_URL}/uploads/categories/barber.jpg`,
  },
  {
    id: "cosmetology",
    name: "Косметология",
    img: `${BASE_URL}/uploads/categories/cosmetology.jpg`,
  },
  {
    id: "massage",
    name: "Массаж & SPA",
    img: `${BASE_URL}/uploads/categories/massage.jpg`,
  },
];
export default function ClientPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [myRecordings, setMyRecordings] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("1");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(
    null,
  );
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | null>(
    null,
  );

  const token = localStorage.getItem("token");
  const linkedId = localStorage.getItem("linkedId");
  const baseUrl = "https://localhost:7164";

  const formServiceId = Form.useWatch("serviceId", form);
  const formDate = Form.useWatch("date", form);
  const { autoBusinessId, autoMasterId, autoServiceId } = location.state || {};
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    axios
      .get(`${baseUrl}/api/Businesses`)
      .then((res) => setBusinesses(res.data))
      .catch(() => message.error("Не удалось загрузить салоны"));

    axios
      .get(`${baseUrl}/api/Employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMasters(res.data);
        if (autoBusinessId) {
          setSelectedBusinessId(autoBusinessId);
          if (autoMasterId) {
            const targetMaster = res.data.find(
              (m: any) => m.id === autoMasterId,
            );
            if (targetMaster) {
              axios
                .get(`${baseUrl}/api/Services?employeeId=${targetMaster.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((sRes) => {
                  setServices(sRes.data);
                  setSelectedMaster(targetMaster);
                  setIsModalOpen(true);
                  form.setFieldsValue({
                    serviceId: autoServiceId || undefined,
                  });
                });
            }
          }
        }
      })
      .catch(() => message.error("Не удалось загрузить список мастеров"));
  }, [navigate, token, autoBusinessId, autoMasterId, autoServiceId]);

  useEffect(() => {
    if (selectedMaster && formServiceId && formDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const formattedDate = (formDate as Dayjs).format("YYYY-MM-DD");
      axios
        .get(
          `${baseUrl}/api/Recordings/slots?masterId=${selectedMaster.id}&serviceId=${formServiceId}&date=${formattedDate}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then((res) => setAvailableSlots(res.data))
        .catch(() => message.error("Ошибка при расчете окон времени"))
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
      .catch(() => message.error("Ошибка при загрузке архива записей"))
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
            { headers: { Authorization: `Bearer ${token}` } },
          );
          message.success("Запись отменена");
          fetchMyRecordings();
        } catch {
          message.error("Не удалось отменить запись");
        }
      },
    });
  };

  const onFinishReview = async (values: any) => {
    if (!selectedRecordingId) return;

    const recording = myRecordings.find((r) => r.id === selectedRecordingId);
    if (!recording) return;

    // Безопасное извлечение ID клиента: проверяем оба регистра в localStorage
    const savedId =
      localStorage.getItem("linkedId") ||
      localStorage.getItem("LinkedId") ||
      "0";
    const cleanClientId = parseInt(savedId, 10);

    // Безопасное приведение ID салона к числу
    const rawBusinessId =
      recording.businessId ||
      recording.emploee?.businessId ||
      selectedBusinessId ||
      0;
    const cleanBusinessId = parseInt(rawBusinessId.toString(), 10);

    // ИСПРАВЛЕНО: JSON-ключи строго в camelCase, а типы полей — чистые валидные Integer для .NET Core
    const payload = {
      recordingId: parseInt(selectedRecordingId.toString(), 10),
      clientId: cleanClientId,
      businessId: cleanBusinessId,
      rating: Math.round(values.rating || 5), // Округляем звезды до строгого int
      comment: values.comment || "",
    };

    try {
      await axios.post(`${baseUrl}/api/Reviews`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      message.success("Ваш отзыв успешно сохранен в базе данных CRM!");
      setIsReviewModalOpen(false);
      reviewForm.resetFields();
      fetchMyRecordings(); // Перекачиваем список для обновления статуса
    } catch (error) {
      console.error("Ошибка сохранения отзыва", error);
      message.error(
        "Не удалось отправить отзыв на сервер. Проверьте заполнение полей.",
      );
    }
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

  const displayedMasters = selectedBusinessId
    ? masters.filter((m) => m.businessId === selectedBusinessId)
    : masters;
  const currentActiveSalon = businesses.find(
    (b) => b.id === selectedBusinessId,
  );

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
      }}
    >
      <Header
        style={{
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #fef3c7",
          padding: "0 40px",
          height: "70px",
        }}
      >
        <Title
          level={4}
          style={{
            margin: 0,
            color: "#faad14",
            cursor: "pointer",
            fontWeight: 800,
          }}
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
      <Content
        style={{
          padding: "40px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "25px" }}>
          <Text
            strong
            style={{
              color: "#78350f",
              fontSize: "16px",
              display: "block",
              marginBottom: "14px",
              fontWeight: 800,
            }}
          >
            <AppstoreOutlined style={{ color: "#faad14" }} /> Выберите категорию
            услуг:
          </Text>
          <div
            style={{
              display: "flex",
              gap: "14px",
              overflowX: "auto",
              paddingBottom: "15px",
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{
                  minWidth: "150px",
                  height: "85px",
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(217,119,6,0.06)",
                  border:
                    selectedCategoryId === cat.id
                      ? "3px solid #faad14"
                      : "2px solid #fff",
                  transition: "all 0.2s ease",
                }}
              >
                <img
                  src={cat.img}
                  alt={cat.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "brightness(0.55)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <Text
                    strong
                    style={{
                      color: "#fff",
                      fontSize: "12px",
                      lineHeight: "1.2",
                      textShadow: "0 2px 4px rgba(0,0,0,0.6)",
                    }}
                  >
                    {cat.name}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "35px" }}>
          <Text
            strong
            style={{
              color: "#78350f",
              fontSize: "16px",
              display: "block",
              marginBottom: "14px",
              fontWeight: 800,
            }}
          >
            <ShopOutlined style={{ color: "#faad14" }} /> Выберите студию
            красоты:
          </Text>
          <div
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              paddingBottom: "12px",
            }}
          >
            <Card
              hoverable
              onClick={() => setSelectedBusinessId(null)}
              style={{
                minWidth: "160px",
                height: "90px",
                borderRadius: "20px",
                border:
                  selectedBusinessId === null
                    ? "3px solid #faad14"
                    : "2px solid #fef3c7",
                background: selectedBusinessId === null ? "#fff7ed" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(217,119,6,0.04)",
              }}
            >
              <Text strong style={{ color: "#451a03", fontSize: "15px" }}>
                ✨ Все филиалы
              </Text>
            </Card>
            {businesses.map((b) => (
              <Card
                key={b.id}
                hoverable
                onClick={() => setSelectedBusinessId(b.id)}
                style={{
                  minWidth: "280px",
                  borderRadius: "20px",
                  border:
                    selectedBusinessId === b.id
                      ? "3px solid #faad14"
                      : "2px solid #fef3c7",
                  background: selectedBusinessId === b.id ? "#fff7ed" : "#fff",
                  boxShadow: "0 8px 24px rgba(217,119,6,0.04)",
                }}
                styles={{ body: { padding: "14px" } }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "14px" }}
                >
                  {b.logoUrl ? (
                    <img
                      src={`${baseUrl}${b.logoUrl}`}
                      alt="logo"
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "14px",
                        objectFit: "cover",
                        border: "1px solid #fef3c7",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "14px",
                        background:
                          "linear-gradient(135deg, #fef3c7 0%, #fde047 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShopOutlined
                        style={{ fontSize: "24px", color: "#d97706" }}
                      />
                    </div>
                  )}
                  <div style={{ overflow: "hidden" }}>
                    <Text
                      strong
                      style={{
                        color: "#451a03",
                        fontSize: "15px",
                        display: "block",
                      }}
                      ellipsis
                    >
                      {b.name}
                    </Text>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: "12px",
                        color: "#78350f",
                        display: "block",
                      }}
                      ellipsis
                    >
                      {b.address}
                    </Text>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        {/* ИСПРАВЛЕНО: Перевели вкладки на современный пропс items, чтобы убрать ошибку в консоли и сжать код */}
        <Tabs
          defaultActiveKey="1"
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === "3") fetchMyRecordings();
          }}
          size="large"
          animated={true}
          items={[
            {
              key: "1",
              label: (
                <span>
                  <InfoCircleOutlined /> О салоне
                </span>
              ),
              disabled: !selectedBusinessId,
              children: currentActiveSalon ? (
                <Card
                  style={{
                    borderRadius: 20,
                    border: "2px solid #fef3c7",
                    background: "#fff",
                    marginTop: 15,
                  }}
                >
                  <Row align="middle">
                    <Col xs={24} md={6} style={{ textAlign: "center" }}>
                      {currentActiveSalon.logoUrl ? (
                        <img
                          src={`${baseUrl}${currentActiveSalon.logoUrl}`}
                          alt="logo"
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 20,
                            objectFit: "cover",
                            border: "3px solid #fef3c7",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 20,
                            background:
                              "linear-gradient(135deg, #fef3c7 0%, #fde047 100%)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShopOutlined
                            style={{ fontSize: 50, color: "#d97706" }}
                          />
                        </div>
                      )}
                    </Col>
                    <Col xs={24} md={18}>
                      <Title
                        level={3}
                        style={{ color: "#451a03", fontWeight: 800, margin: 0 }}
                      >
                        {currentActiveSalon.name}
                      </Title>
                      <Paragraph
                        style={{
                          color: "#78350f",
                          margin: "10px 0",
                          fontSize: 15,
                        }}
                      >
                        {currentActiveSalon.description ||
                          "Премиальное бьюти-пространство."}
                      </Paragraph>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 20,
                          fontSize: 14,
                          color: "#92400e",
                          fontWeight: 600,
                        }}
                      >
                        <span>
                          <EnvironmentOutlined style={{ color: "#e11d48" }} />{" "}
                          {currentActiveSalon.address}
                        </span>
                        <span>
                          <ClockCircleOutlined style={{ color: "#059669" }} />{" "}
                          {currentActiveSalon.workingHours || "09:00 - 21:00"}
                        </span>
                        <span>
                          <PhoneOutlined style={{ color: "#2563eb" }} />{" "}
                          {currentActiveSalon.phone}
                        </span>
                      </div>
                    </Col>
                  </Row>
                </Card>
              ) : (
                <div
                  style={{
                    padding: "40px 0",
                    textAlign: "center",
                    background: "#fff",
                    borderRadius: 16,
                    marginTop: 15,
                    border: "2px dashed #fef3c7",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 15 }}>
                    Выберите конкретную бьюти-студию из ленты выше.
                  </Text>
                </div>
              ),
            },
            {
              key: "2",
              label: (
                <span>
                  <UserOutlined /> Специалисты ({displayedMasters.length})
                </span>
              ),
              children: (
                <Row style={{ marginTop: 15 }}>
                  {displayedMasters.length === 0 ? (
                    <Col
                      span={24}
                      style={{ textAlign: "center", padding: "40px 0" }}
                    >
                      <Text type="secondary" style={{ fontSize: 15 }}>
                        В выбранном филиале пока нет доступных мастеров.
                      </Text>
                    </Col>
                  ) : (
                    displayedMasters.map((m) => (
                      <Col xs={24} sm={12} md={8} key={m.id}>
                        <Card
                          hoverable
                          style={{
                            borderRadius: 20,
                            boxShadow: "0 10px 30px rgba(217,119,6,0.04)",
                            textAlign: "center",
                            border: "2px solid #fef3c7",
                            background: "#fff",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 15,
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 90,
                                height: 90,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "3px solid #fff",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              }}
                            >
                              {m.avatarUrl ? (
                                <Image
                                  src={`${baseUrl}${m.avatarUrl}`}
                                  alt="master"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <Avatar
                                  size={90}
                                  icon={<UserOutlined />}
                                  style={{ background: "#fbbf24" }}
                                />
                              )}
                            </div>
                          </div>
                          <Title
                            level={4}
                            style={{
                              margin: "0 0 4px 0",
                              color: "#451a03",
                              fontWeight: 800,
                            }}
                          >
                            {m.name} {m.surname || ""}
                          </Title>
                          <div style={{ marginBottom: 16 }}>
                            <Tag
                              color="warning"
                              style={{ fontWeight: 700, borderRadius: 6 }}
                            >
                              {m.jobTitle || "Специалист"}
                            </Tag>
                          </div>
                          <div style={{ textAlign: "left", marginBottom: 20 }}>
                            <Text
                              type="secondary"
                              strong
                              style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 12,
                                color: "#78350f",
                              }}
                            >
                              <PictureOutlined /> Работы мастера (клик для
                              просмотра):
                            </Text>
                            {m.portfolioPhotos &&
                            m.portfolioPhotos.length > 0 ? (
                              <Row style={{ margin: 0 }}>
                                <Image.PreviewGroup>
                                  {m.portfolioPhotos
                                    .slice(0, 4)
                                    .map((url, idx) => (
                                      <Col
                                        span={6}
                                        key={idx}
                                        style={{ padding: "0 4px" }}
                                      >
                                        <div
                                          style={{
                                            width: "100%",
                                            height: 55,
                                            borderRadius: 8,
                                            overflow: "hidden",
                                            border: "1px solid #fef3c7",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <Image
                                            src={`${baseUrl}${url.startsWith("/") ? url : "/" + url}`}
                                            alt="work"
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </div>
                                      </Col>
                                    ))}
                                </Image.PreviewGroup>
                              </Row>
                            ) : (
                              <div
                                style={{
                                  background: "#fffbeb",
                                  padding: 10,
                                  borderRadius: 8,
                                  fontSize: 11,
                                  color: "#b45309",
                                  textAlign: "center",
                                  border: "1px dashed #faad14",
                                }}
                              >
                                Галерея работ пуста
                              </div>
                            )}
                          </div>
                          <Button
                            type="primary"
                            block
                            size="large"
                            onClick={() => openBooking(m)}
                            style={{
                              background:
                                "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                              borderColor: "#d97706",
                              borderRadius: 12,
                              fontWeight: 800,
                              height: 44,
                              color: "#fff",
                            }}
                          >
                            Записаться к мастеру
                          </Button>
                        </Card>
                      </Col>
                    ))
                  )}
                </Row>
              ),
            },
            {
              key: "3",
              label: (
                <span>
                  <CalendarOutlined /> Мои записи
                </span>
              ),
              children: (
                <Table
                  dataSource={myRecordings}
                  rowKey="id"
                  loading={loadingRecordings}
                  style={{ marginTop: 15 }}
                  pagination={{ pageSize: 6 }}
                  columns={[
                    {
                      title: "Дата и время визита",
                      dataIndex: "appointmentTime",
                      key: "date",
                      render: (t) =>
                        new Date(t).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                    },
                    {
                      title: "Специалист",
                      key: "master",
                      render: (_, r) => (
                        <span>{r.emploee?.name || "Мастер"}</span>
                      ),
                    },
                    {
                      title: "Бьюти-услуга",
                      key: "service",
                      render: (_, r) => (
                        <Tag color="warning" style={{ fontWeight: 600 }}>
                          {r.service?.name}
                        </Tag>
                      ),
                    },
                    {
                      title: "Статус записи",
                      dataIndex: "status",
                      key: "status",
                      render: (status) => (
                        <Tag
                          color={
                            status === "Cancelled"
                              ? "red"
                              : status === "Completed"
                                ? "green"
                                : status === "Reviewed"
                                  ? "gold"
                                  : "blue"
                          }
                          style={{ fontWeight: 600 }}
                        >
                          {status === "Scheduled"
                            ? "Ожидается"
                            : status === "Cancelled"
                              ? "Отменена"
                              : status === "Reviewed"
                                ? "Отзыв добавлен"
                                : "Выполнено"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Управление",
                      key: "action",
                      render: (_, r) => {
                        if (r.status === "Scheduled")
                          return (
                            <Button
                              type="link"
                              danger
                              onClick={() => handleCancel(r.id)}
                              style={{ fontWeight: 600 }}
                            >
                              Отменить визит
                            </Button>
                          );
                        if (r.status === "Completed")
                          return (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CommentOutlined />}
                              style={{
                                background: "#059669",
                                borderColor: "#059669",
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                              onClick={() => {
                                setSelectedRecordingId(r.id);
                                setIsReviewModalOpen(true);
                              }}
                            >
                              Оставить отзыв
                            </Button>
                          );
                        if (r.status === "Reviewed")
                          return (
                            <Text
                              type="secondary"
                              style={{ fontSize: 13, fontWeight: 500 }}
                            >
                              ✨ Отзыв в базе данных
                            </Text>
                          );
                        return null;
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        {/* МОДАЛЬНОЕ ОКНО ОНЛАЙН-БРОНИРОВАНИЯ СЛОТОВ ВРЕМЕНИ */}
        <Modal
          title={`Онлайн-запись к специалисту: ${selectedMaster?.name}`}
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => setIsModalOpen(false)}
          okText="Подтвердить бронь"
          cancelText="Назад"
          okButtonProps={{
            disabled: !selectedSlot,
            style: {
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              borderColor: "#d97706",
              fontWeight: 700,
              color: "#fff",
            },
          }}
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="serviceId"
              label="1. Выберите желаемую услугу"
              rules={[{ required: true, message: "Выберите процедуру" }]}
            >
              <Select placeholder="Доступные бьюти-процедуры мастера">
                {services.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name} — {s.price} ₽
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="date"
              label="2. Выберите дату визита"
              rules={[{ required: true, message: "Укажите дату календаря" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>
            {formServiceId && formDate && (
              <div style={{ marginTop: 20 }}>
                <Text
                  strong
                  style={{
                    display: "block",
                    marginBottom: 10,
                    color: "#475569",
                  }}
                >
                  3. Доступные окна сеанса:
                </Text>
                {loadingSlots ? (
                  <Text type="secondary">
                    Подбираем свободные окна мастера...
                  </Text>
                ) : availableSlots.length === 0 ? (
                  <Text type="danger" strong>
                    Свободных слотов времени на эту дату нет. Выберите другой
                    день.
                  </Text>
                ) : (
                  <Row style={{ margin: 0 }}>
                    {availableSlots.map((slot) => (
                      <Col span={6} key={slot} style={{ padding: "4px" }}>
                        <Button
                          type={selectedSlot === slot ? "primary" : "default"}
                          block
                          style={{
                            borderRadius: 8,
                            borderColor:
                              selectedSlot === slot ? "#faad14" : "#cbd5e1",
                            background:
                              selectedSlot === slot ? "#faad14" : "#fff",
                            color: selectedSlot === slot ? "#fff" : "#1e293b",
                            fontWeight: 600,
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

        {/* МОДАЛЬНОЕ ОКНО ОСТАВЛЕНИЯ ЗВЕЗД И ОТЗЫВОВ КЛИЕНТА */}
        <Modal
          title="🌟 Оцените качество бьюти-услуги"
          open={isReviewModalOpen}
          onOk={() => reviewForm.submit()}
          onCancel={() => setIsReviewModalOpen(false)}
          okText="Отправить отзыв"
          cancelText="Отмена"
          okButtonProps={{
            style: {
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              borderColor: "#d97706",
              fontWeight: 700,
              color: "#fff",
            },
          }}
        >
          <Form form={reviewForm} layout="vertical" onFinish={onFinishReview}>
            <Form.Item
              name="rating"
              label="1. Поставьте вашу оценку специалисту:"
              rules={[
                {
                  required: true,
                  message: "Пожалуйста, укажите количество звезд",
                },
              ]}
              initialValue={5}
            >
              <Rate style={{ fontSize: 28, color: "#faad14" }} />
            </Form.Item>
            <Form.Item
              name="comment"
              label="2. Напишите ваш отзыв о визите:"
              rules={[
                {
                  required: true,
                  message: "Напишите ваши впечатления о процедуре",
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Расскажите, как прошло преображение?"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
