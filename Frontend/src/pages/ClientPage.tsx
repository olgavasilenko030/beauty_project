import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
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

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;
const { CheckableTag } = Tag; // Безопасный импорт компонента из библиотеки AntD

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

  const [ads, setAds] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]); // ДОБАВЛЕНО: Списочный стейт всех услуг для фильтрации

  const categories = [
    { id: "all", name: "🚀 Все услуги", img: "" },
    {
      id: "hair",
      name: "Парикмахерские услуги",
      img: `${baseUrl}/uploads/categories/hair.jpg`,
    },
    {
      id: "nails",
      name: "Ногтевой сервис",
      img: `${baseUrl}/uploads/categories/nails.jpg`,
    },
    {
      id: "brows",
      name: "Ресницы & Брови",
      img: `${baseUrl}/uploads/categories/brows.jpg`,
    },
    {
      id: "barber",
      name: "Барбершоп",
      img: `${baseUrl}/uploads/categories/barber.jpg`,
    },
    {
      id: "cosmetology",
      name: "Косметология",
      img: `${baseUrl}/uploads/categories/cosmetology.jpg`,
    },
    {
      id: "massage",
      name: "Массаж & SPA",
      img: `${baseUrl}/uploads/categories/massage.jpg`,
    },
  ];

  const fetchMyRecordings = () => {
    setLoadingRecordings(true);
    axios
      .get(`${baseUrl}/api/Recordings/ForClient/${linkedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMyRecordings(res.data || []))
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

    const savedId =
      localStorage.getItem("linkedId") ||
      localStorage.getItem("LinkedId") ||
      "0";
    const cleanClientId = parseInt(savedId, 10);
    const rawBusinessId =
      recording.businessId ||
      recording.emploee?.businessId ||
      selectedBusinessId ||
      0;
    const cleanBusinessId = parseInt(rawBusinessId.toString(), 10);

    const payload = {
      recordingId: parseInt(selectedRecordingId.toString(), 10),
      clientId: cleanClientId,
      businessId: cleanBusinessId,
      rating: Math.round(values.rating || 5),
      comment: values.comment || "",
    };

    try {
      await axios.post(`${baseUrl}/api/Reviews`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Ваш отзыв успешно сохранен в базе данных CRM!");
      setIsReviewModalOpen(false);
      reviewForm.resetFields();
      fetchMyRecordings();
    } catch {
      message.error("Не удалось отправить отзыв на сервер.");
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
        setServices(res.data || []);
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
      fetchMyRecordings();
    } catch (error: any) {
      message.error(error.response?.data || "Ошибка при создании записи");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    axios
      .get(`${baseUrl}/api/Businesses`)
      .then((res) => setBusinesses(res.data || []))
      .catch(() => message.error("Не удалось загрузить salons"));

    axios
      .get(`${baseUrl}/api/Employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const allMasters = res.data || [];
        setMasters(allMasters);
        if (autoBusinessId) {
          setSelectedBusinessId(autoBusinessId);
          if (autoMasterId) {
            const targetMaster = allMasters.find(
              (m: any) => m.id === autoMasterId,
            );
            if (targetMaster) {
              axios
                .get(`${baseUrl}/api/Services?employeeId=${targetMaster.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((sRes) => {
                  setServices(sRes.data || []);
                  setSelectedMaster(targetMaster);
                  setIsModalOpen(true);
                  form.setFieldsValue({
                    serviceId: autoServiceId || undefined,
                    date: dayjs(),
                  });
                });
            }
          }
        }
      })
      .catch(() => message.error("Не удалось загрузить список мастеров"));

    axios
      .get(`${baseUrl}/api/Advertisements/active`)
      .then((res) => setAds(res.data || []))
      .catch(() => setAds([]));

    // ДОБАВЛЕНО: Скачиваем полный прайс-лист всех салонов для глубокой фильтрации по тексту услуг
    axios
      .get(`${baseUrl}/api/Services`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAllServices(res.data || []))
      .catch(() =>
        console.error("Ошибка предзагрузки глобального прайса услуг"),
      );
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
        .then((res) => setAvailableSlots(res.data || []))
        .catch(() => message.error("Ошибка при расчете окон времени"))
        .finally(() => setLoadingSlots(false));
    } else {
      setAvailableSlots([]);
    }
  }, [formServiceId, formDate, selectedMaster, token]);

  const displayedMasters = selectedBusinessId
    ? masters.filter((m) => m.businessId === selectedBusinessId)
    : masters;
  const currentActiveSalon = businesses.find(
    (b) => b.id === selectedBusinessId,
  );

  const leftAds = ads ? ads.filter((a: any) => a.format === "LeftSidebar") : [];
  const rightAds = ads
    ? ads.filter((a: any) => a.format === "RightSidebar")
    : [];

  // Живая фильтрация салонов по Названию и Тексту бьюти-процедур (name) из базы данных
  const filteredBusinesses = businesses.filter((b: any) => {
    if (!selectedCategoryId || selectedCategoryId === "all") return true;

    const salonName = (b.name || "").toLowerCase();

    // 1. Фильтр по названию самого салона (резервный)
    if (
      selectedCategoryId === "nails" &&
      (salonName.includes("ногт") ||
        salonName.includes("маник") ||
        salonName.includes("пилк"))
    )
      return true;
    if (
      selectedCategoryId === "hair" &&
      (salonName.includes("парик") ||
        salonName.includes("стриж") ||
        salonName.includes("стилист"))
    )
      return true;
    if (
      selectedCategoryId === "brows" &&
      (salonName.includes("бров") ||
        salonName.includes("ресн") ||
        salonName.includes("взгляд"))
    )
      return true;
    if (
      selectedCategoryId === "barber" &&
      (salonName.includes("барбер") || salonName.includes("barber"))
    )
      return true;

    // 2. Глубокий фильтр: Ищем услуги текущего салона в общем прайсе allServices по полю name
    const currentSalonServices = allServices.filter(
      (s: any) => s.businessId === b.id || s.BusinessId === b.id,
    );

    return currentSalonServices.some((s: any) => {
      const serviceName = (s.name || "").toLowerCase();

      if (
        selectedCategoryId === "nails" &&
        (serviceName.includes("маник") ||
          serviceName.includes("педик") ||
          serviceName.includes("гель"))
      )
        return true;
      if (
        selectedCategoryId === "hair" &&
        (serviceName.includes("стрижка") ||
          serviceName.includes("окрашив") ||
          serviceName.includes("укладка"))
      )
        return true;
      if (
        selectedCategoryId === "brows" &&
        (serviceName.includes("брови") ||
          serviceName.includes("ресниц") ||
          serviceName.includes("ламин"))
      )
        return true;

      // ВОТ ОНО! Строгая фильтрация барбершопа по бритью, бороде и мужским стрижкам
      if (
        selectedCategoryId === "barber" &&
        (serviceName.includes("брить") || serviceName.includes("бород"))
      )
        return true;

      if (
        selectedCategoryId === "cosmetology" &&
        (serviceName.includes("пилинг") ||
          serviceName.includes("чистка") ||
          serviceName.includes("лиц"))
      )
        return true;
      if (
        selectedCategoryId === "massage" &&
        (serviceName.includes("массаж") ||
          serviceName.includes("спа") ||
          serviceName.includes("spa"))
      )
        return true;

      return false;
    });
  });

  return (
    <Layout style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* ПРЕМИАЛЬНЫЙ ФИКСИРОВАННЫЙ ХЕДЕР */}
      <Header
        style={{
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 40px",
          height: "70px",
          position: "sticky",
          top: 0,
          zIndex: 100,
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
        <Space size="middle">
          <Button
            type="dashed"
            icon={<SettingOutlined />}
            onClick={() => navigate("/settings")}
          >
            Профиль
          </Button>
          <Button
            danger
            type="primary"
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
      {/* ПОЛНОЭКРАННЫЙ РЕЗИНОВЫЙ ТРЕХКОЛОНОЧНЫЙ КОНТЕЙНЕР (FULL SCREEN) */}
      <div
        style={{
          display: "flex",
          width: "100%",
          padding: "0 20px",
          position: "relative",
        }}
      >
        {/* ЛЕВЫЙ ПЛАВАЮЩИЙ САЙДБАР РЕКЛАМЫ */}
        {leftAds.length > 0 && (
          <div
            style={{
              width: "160px",
              padding: "40px 10px 20px 10px",
              position: "sticky",
              top: "70px",
              height: "calc(100vh - 70px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                textAlign: "center",
                marginBottom: "-10px",
              }}
            >
              Реклама
            </div>
            {leftAds.map((ad: any) => (
              <a
                href={ad.targetUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                key={ad.id}
                style={{ display: "block", textDecoration: "none" }}
              >
                <Card
                  hoverable
                  style={{
                    borderRadius: "16px",
                    border: "2px solid #fef3c7",
                    background: "#fffbeb",
                    overflow: "hidden",
                    padding: "4px",
                  }}
                  styles={{ body: { padding: "8px", textAlign: "center" } }}
                >
                  <img
                    src={`${baseUrl}${ad.imageUrl}`}
                    alt={ad.title}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "1px solid #fde047",
                    }}
                  />
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "12px",
                      color: "#451a03",
                      marginTop: "8px",
                      lineHeight: "1.2",
                    }}
                  >
                    {ad.title}
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
        {/* ЦЕНТРАЛЬНАЯ ОБЛАСТЬ СТУДИЙ И МАСТЕРОВ */}
        <div style={{ flex: 1, minWidth: 0, padding: "20px" }}>
          <Content style={{ width: "100%" }}>
            {/* СТИЛЬНАЯ ТЕМНАЯ HERO-ПАНЕЛЬ ПРИВЕТСТВИЯ КЛИЕНТА */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                padding: "30px 40px",
                borderRadius: "20px",
                color: "#fff",
                marginBottom: "30px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
              }}
            >
              <Title
                level={3}
                style={{ color: "#fff", margin: 0, fontWeight: 800 }}
              >
                ✨ Личный кабинет клиента
              </Title>
              <Paragraph
                style={{
                  color: "#94a3b8",
                  margin: "6px 0 0 0",
                  fontSize: "14px",
                }}
              >
                Управляйте своими визитами онлайн, просматривайте портфолио
                топ-мастеров и открывайте эксклюзивные предложения салонов.
              </Paragraph>
            </div>
            {/* БЛОК ГРАФИЧЕСКИХ КАТЕГОРИЙ С КАРТИНКАМИ И ЖИВЫМ ФИЛЬТРОМ */}
            <div style={{ marginBottom: "30px" }}>
              <Text
                strong
                style={{
                  color: "#1e293b",
                  fontSize: "16px",
                  display: "block",
                  marginBottom: "14px",
                  fontWeight: 800,
                }}
              >
                <AppstoreOutlined style={{ color: "#faad14" }} /> Выберите
                категорию услуг:
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
                      minWidth: "160px",
                      height: "90px",
                      position: "relative",
                      borderRadius: "16px",
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
                      border:
                        selectedCategoryId === cat.id
                          ? "3px solid #faad14"
                          : "2px solid #fff",
                      transition: "all 0.25s ease",
                      transform:
                        selectedCategoryId === cat.id
                          ? "scale(1.02)"
                          : "scale(1)",
                    }}
                  >
                    {/* Если это кнопка Все услуги — ставим красивый бьюти-градиент */}
                    {cat.id === "all" ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, #faad14 0%, #d97706 100%)",
                        }}
                      />
                    ) : (
                      <img
                        src={cat.img}
                        alt={cat.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter: "brightness(0.50)",
                        }}
                      />
                    )}
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
                          fontSize: "13px",
                          lineHeight: "1.2",
                          textShadow: "0 2px 4px rgba(0,0,0,0.7)",
                        }}
                      >
                        {cat.name.replace(
                          /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g,
                          "",
                        )}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ГРИД-ЛЕНТА ВЫБОРА БЬЮТИ-СТУДИИ С ЖИВЫМ ФИЛЬТРОМ */}
            <div style={{ marginBottom: "35px" }}>
              <Text
                strong
                style={{
                  color: "#1e293b",
                  fontSize: "15px",
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: 700,
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
                    borderRadius: "16px",
                    border:
                      selectedBusinessId === null
                        ? "2px solid #faad14"
                        : "1px solid #e2e8f0",
                    background:
                      selectedBusinessId === null ? "#fff7ed" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <Text
                    strong
                    style={{
                      color:
                        selectedBusinessId === null ? "#d97706" : "#1e293b",
                      fontSize: "14px",
                    }}
                  >
                    ✨ Все филиалы
                  </Text>
                </Card>

                {filteredBusinesses.map((b: any) => (
                  <Card
                    key={b.id}
                    hoverable
                    onClick={() => setSelectedBusinessId(b.id)}
                    style={{
                      minWidth: "280px",
                      borderRadius: "16px",
                      border:
                        selectedBusinessId === b.id
                          ? "2px solid #faad14"
                          : "1px solid #e2e8f0",
                      background:
                        selectedBusinessId === b.id ? "#fff7ed" : "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                    }}
                    styles={{ body: { padding: "14px" } }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      {b.logoUrl ? (
                        <img
                          src={`${baseUrl}${b.logoUrl}`}
                          alt="logo"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "12px",
                            objectFit: "cover",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "12px",
                            background:
                              "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShopOutlined
                            style={{ fontSize: "20px", color: "#64748b" }}
                          />
                        </div>
                      )}
                      <div style={{ overflow: "hidden" }}>
                        <Text
                          strong
                          style={{
                            color: "#1e293b",
                            fontSize: "14px",
                            display: "block",
                          }}
                          ellipsis
                        >
                          {b.name}
                        </Text>
                        <Text
                          type="secondary"
                          style={{ fontSize: "12px", display: "block" }}
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

            {/* ИНТЕРАКТИВНЫЕ ВКЛАДКИ */}
            <Tabs
              defaultActiveKey="1"
              activeKey={activeTab}
              onChange={(key: string) => {
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
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        marginTop: 15,
                        boxShadow: "0 4px 15px rgba(0,0,0,0.01)",
                      }}
                    >
                      <Row align="middle" gutter={24}>
                        <Col xs={24} md={6} style={{ textAlign: "center" }}>
                          {currentActiveSalon.logoUrl ? (
                            <img
                              src={`${baseUrl}${currentActiveSalon.logoUrl}`}
                              alt="logo"
                              style={{
                                width: 130,
                                height: 130,
                                borderRadius: 20,
                                objectFit: "cover",
                                border: "2px solid #e2e8f0",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 130,
                                height: 130,
                                borderRadius: 20,
                                background:
                                  "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <ShopOutlined
                                style={{ fontSize: 44, color: "#64748b" }}
                              />
                            </div>
                          )}
                        </Col>
                        <Col xs={24} md={18}>
                          <Title
                            level={3}
                            style={{
                              color: "#1e293b",
                              fontWeight: 800,
                              margin: 0,
                            }}
                          >
                            {currentActiveSalon.name}
                          </Title>
                          <Paragraph
                            style={{
                              color: "#475569",
                              margin: "10px 0",
                              fontSize: 15,
                            }}
                          >
                            {currentActiveSalon.description ||
                              "Премиальное бьюти-пространство вашей идеальной заботы о себе."}
                          </Paragraph>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 20,
                              fontSize: 14,
                              color: "#475569",
                              fontWeight: 600,
                            }}
                          >
                            <span>
                              <EnvironmentOutlined
                                style={{ color: "#e11d48" }}
                              />{" "}
                              {currentActiveSalon.address}
                            </span>
                            <span>
                              <ClockCircleOutlined
                                style={{ color: "#059669" }}
                              />{" "}
                              {currentActiveSalon.workingHours ||
                                "09:00 - 21:00"}
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
                        border: "2px dashed #e2e8f0",
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
                    <Row gutter={[20, 20]} style={{ marginTop: 15 }}>
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
                                boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                                textAlign: "center",
                                border: "1px solid #e2e8f0",
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
                                      src={`${baseUrl}${m.avatarUrl.startsWith("/") ? m.avatarUrl : "/" + m.avatarUrl}`}
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
                                      style={{ background: "#faad14" }}
                                    />
                                  )}
                                </div>
                              </div>
                              <Title
                                level={4}
                                style={{
                                  margin: "0 0 4px 0",
                                  color: "#1e293b",
                                  fontWeight: 800,
                                }}
                              >
                                {m.name} {m.surname || ""}
                              </Title>
                              <div style={{ marginBottom: 16 }}>
                                <Tag
                                  color="gold"
                                  style={{ fontWeight: 700, borderRadius: 6 }}
                                >
                                  {m.jobTitle || "Специалист"}
                                </Tag>
                              </div>

                              <div
                                style={{ textAlign: "left", marginBottom: 20 }}
                              >
                                <Text
                                  type="secondary"
                                  strong
                                  style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontSize: 12,
                                    color: "#475569",
                                  }}
                                >
                                  <PictureOutlined /> Работы мастера:
                                </Text>
                                {m.portfolioPhotos &&
                                m.portfolioPhotos.length > 0 ? (
                                  <Row
                                    gutter={[8, 8]}
                                    style={{ margin: "0 -4px" }}
                                  >
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
                                                border: "1px solid #e2e8f0",
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
                                      background: "#f8fafc",
                                      padding: 10,
                                      borderRadius: 8,
                                      fontSize: 11,
                                      color: "#64748b",
                                      textAlign: "center",
                                      border: "1px dashed #cbd5e1",
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
                                  background: "#faad14",
                                  borderColor: "#faad14",
                                  borderRadius: 12,
                                  fontWeight: 800,
                                  height: 44,
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
                            <span>
                              {r.emploee?.name || r.employee?.name || "Мастер"}
                            </span>
                          ),
                        },
                        {
                          title: "Бьюти-услуга",
                          key: "service",
                          render: (_, r) => (
                            <Tag color="gold" style={{ fontWeight: 600 }}>
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
                                  ✨ Отзыв отправлен
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
          </Content>
        </div>{" "}
        {/* CLOSE: Центральный контентный блок */}
        {/* ПРАВЫЙ ПЛАВАЮЩИЙ САЙДБАР РЕКЛАМЫ */}
        {rightAds.length > 0 && (
          <div
            style={{
              width: "160px",
              padding: "40px 10px 20px 10px",
              position: "sticky",
              top: "70px",
              height: "calc(100vh - 70px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                textAlign: "center",
                marginBottom: "-10px",
              }}
            >
              Реклама
            </div>
            {rightAds.map((ad: any) => (
              <a
                href={ad.targetUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                key={ad.id}
                style={{ display: "block", textDecoration: "none" }}
              >
                <Card
                  hoverable
                  style={{
                    borderRadius: "16px",
                    border: "2px solid #fef3c7",
                    background: "#fffbeb",
                    overflow: "hidden",
                    padding: "4px",
                  }}
                  styles={{ body: { padding: "8px", textAlign: "center" } }}
                >
                  <img
                    src={`${baseUrl}${ad.imageUrl}`}
                    alt={ad.title}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "1px solid #fde047",
                    }}
                  />
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "12px",
                      color: "#451a03",
                      marginTop: "8px",
                      lineHeight: "1.2",
                    }}
                  >
                    {ad.title}
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>{" "}
      {/* CLOSE: Глобальный резиновый трехколоночный flex-контейнер */}
      {/* МОДАЛЬНОЕ ОКНО ОНЛАЙН-БРОНИРОВАНИЯ СЛОТОВ ВРЕМЕНИ */}
      <Modal
        title={`Онлайн-запись к специалисту: ${selectedMaster?.name}`}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedMaster(null);
        }}
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
            rules={[{ required: true, message: "Укажите дату календаря" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD.MM.YYYY"
              allowClear={false}
            />
          </Form.Item>
          {formServiceId && formDate && (
            <div style={{ marginTop: 20 }}>
              <Text
                strong
                style={{ display: "block", marginBottom: 10, color: "#475569" }}
              >
                3. Доступные окна сеанса:
              </Text>
              {loadingSlots ? (
                <Text type="secondary">
                  Подбираем свободные окна мастера...
                </Text>
              ) : availableSlots.length === 0 ? (
                <Text type="danger" strong>
                  Свободных slots времени на эту дату нет. Выберите другой день.
                </Text>
              ) : (
                <Row gutter={[8, 8]} style={{ margin: 0 }}>
                  {availableSlots.map((slot) => (
                    <Col span={6} key={slot}>
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
      <Footer
        style={{
          textAlign: "center",
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
          padding: "20px",
        }}
      >
        <strong>Beauty Hub ©2026</strong> — Профессиональная CRM-платформа
        автоматизации сферы услуг
      </Footer>
    </Layout>
  );
}
