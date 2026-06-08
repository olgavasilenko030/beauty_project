import React, { useEffect, useState } from "react";
import {
  Layout,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Avatar,
  message,
  Rate,
} from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShopOutlined, UserOutlined, StarOutlined } from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

interface Master {
  id: number;
  name: string;
  surname?: string;
  jobTitle?: string;
  avatarUrl?: string;
}

// Высококачественные CDN-ссылки на реальные бьюти-фотографии
// Переносим базовый URL бэкенда вверх, чтобы использовать в массиве
const BASE_URL = "https://localhost:7164";

const categories = [
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

export default function HomePage() {
  const navigate = useNavigate();
  const [topMasters, setTopMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const baseUrl = "https://localhost:7164";

  useEffect(() => {
    axios
      .get(`${baseUrl}/api/Employees/public-top`)
      .then((res) => setTopMasters(res.data))
      .catch(() => message.error("Не удалось загрузить мастеров"))
      .finally(() => setLoading(false));
  }, []);

  const handleBookingClick = () => {
    if (token) {
      navigate("/client");
    } else {
      message.info("Для онлайн-записи необходимо войти в систему");
      navigate("/login", { state: { targetRole: "Client" } });
    }
  };

  return (
    <Layout style={{ minHeight: "110vh", background: "#fff" }}>
      {/* Навигационная панель */}
      <Header
        style={{
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 40px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: "70px",
        }}
      >
        <Title
          level={3}
          style={{
            margin: 0,
            color: "#faad14",
            fontWeight: 800,
            letterSpacing: "0.5px",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          BEAUTY HUB
        </Title>
        <Space size="large">
          <Button
            type="text"
            size="large"
            onClick={() =>
              navigate("/login", { state: { targetRole: "Business" } })
            }
            style={{ fontWeight: 500 }}
          >
            Вход для бизнеса <ShopOutlined />
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={() =>
              navigate(token ? "/client" : "/login", {
                state: { targetRole: "Client" },
              })
            }
            style={{
              background: "#faad14",
              borderColor: "#faad14",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Вход для клиентов <UserOutlined />
          </Button>
        </Space>
      </Header>

      <Content>
        {/* Главный приветственный баннер (Hero Section) */}
        {/* ПРЕМИАЛЬНЫЙ ДВУХЗОННЫЙ ГЛАВНЫЙ БАННЕР (HERO SECTION) */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            padding: "80px 60px",
            color: "#fff",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <Row gutter={[40, 40]} align="middle">
              {/* ЛЕВАЯ СТОРОНА: Текстовый контент, кнопка и статистика */}
              <Col xs={24} lg={12}>
                <Space
                  direction="vertical"
                  size={24}
                  style={{ textAlign: "left" }}
                >
                  <Tag
                    color="warning"
                    style={{
                      fontSize: "14px",
                      padding: "4px 16px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      background: "rgba(250, 173, 20, 0.15)",
                      borderColor: "#faad14",
                    }}
                  >
                    ✨ Экосистема умной онлайн-записи №1
                  </Tag>

                  <Title
                    style={{
                      color: "#fff",
                      fontSize: "52px",
                      fontWeight: 900,
                      lineHeight: 1.15,
                      margin: 0,
                    }}
                  >
                    Ваша идеальная <br />
                    <span
                      style={{
                        color: "#faad14",
                        textShadow: "0 0 20px rgba(250, 173, 20, 0.3)",
                      }}
                    >
                      бьюти-запись
                    </span>{" "}
                    <br />в один клик
                  </Title>

                  <Paragraph
                    style={{
                      color: "#94a3b8",
                      fontSize: "18px",
                      lineHeight: 1.6,
                      maxWidth: 540,
                      margin: 0,
                    }}
                  >
                    Профессиональная платформа автоматизации: находите топовых
                    мастеров вашего города, изучайте реальное портфолио и
                    бронируйте время за 10 секунд без лишних звонков.
                  </Paragraph>

                  <div style={{ marginTop: "10px" }}>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleBookingClick}
                      style={{
                        background: "#faad14",
                        borderColor: "#faad14",
                        height: "54px",
                        padding: "0 40px",
                        fontSize: "16px",
                        fontWeight: 700,
                        borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(250, 173, 20, 0.25)",
                      }}
                    >
                      Выбрать мастера и время
                    </Button>
                  </div>

                  {/* ИНТЕРАКТИВНЫЕ МЕТРИКИ (Счетчики доверия) */}
                  <Row
                    gutter={[24, 24]}
                    style={{
                      marginTop: "20px",
                      borderTop: "1px solid #334155",
                      paddingTop: "30px",
                    }}
                  >
                    <Col span={8}>
                      <Title
                        level={3}
                        style={{ color: "#fff", margin: 0, fontWeight: 800 }}
                      >
                        140+
                      </Title>
                      <Text style={{ color: "#64748b", fontSize: "14px" }}>
                        Салонов красоты
                      </Text>
                    </Col>
                    <Col span={8}>
                      <Title
                        level={3}
                        style={{ color: "#fff", margin: 0, fontWeight: 800 }}
                      >
                        850+
                      </Title>
                      <Text style={{ color: "#64748b", fontSize: "14px" }}>
                        Топ мастеров
                      </Text>
                    </Col>
                    <Col span={8}>
                      <Title
                        level={3}
                        style={{ color: "#fff", margin: 0, fontWeight: 800 }}
                      >
                        4.9
                      </Title>
                      <Text style={{ color: "#64748b", fontSize: "14px" }}>
                        Средний рейтинг
                      </Text>
                    </Col>
                  </Row>
                </Space>
              </Col>

              {/* ПРАВАЯ СТОРОНА: Большая, сочная 3D-карточка премиум-салона */}
              <Col
                xs={24}
                lg={12}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <div
                  style={{
                    width: "100%",
                    maxHeight: "480px",
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
                    border: "1px solid #334155",
                  }}
                >
                  <img
                    src={`${BASE_URL}/uploads/categories/hero-salon.jpg`} // Убедитесь, что положили красивое фото интерьера салона сюда
                    alt="Premium Beauty Salon"
                    style={{
                      width: "100%",
                      height: "480px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* Адаптивная сетка категорий (Заменила карусель) */}
        {/* КРУПНЫЙ Блок категорий услуг в стиле Premium Grid */}
        <div style={{ padding: "80px 40px", background: "#fafafa" }}>
          <Title
            level={2}
            style={{
              textAlign: "center",
              fontWeight: 800,
              marginBottom: 50,
              letterSpacing: "0.5px",
            }}
          >
            Популярные категории услуг
          </Title>

          {/* ИСПРАВЛЕНО: Сетка категорий теперь переходит на страницу фильтрации салонов по cat.id */}
          <Row gutter={[32, 32]} style={{ maxWidth: 1400, margin: "0 auto" }}>
            {categories.map((cat, index) => (
              <Col xs={24} sm={12} md={12} lg={8} key={index}>
                <Card
                  hoverable
                  onClick={() => {
                    // Если у категории есть id, переходим на фильтрацию, иначе используем имя
                    const param = (cat as any).id || cat.name;
                    navigate(`/salons?category=${param}`);
                  }}
                  cover={
                    <img
                      alt={cat.name}
                      src={cat.img}
                      style={{
                        height: "240px",
                        objectFit: "cover",
                        borderRadius: "16px 16px 0 0",
                      }}
                    />
                  }
                  style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "none",
                    height: "100%",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                    transition: "all 0.3s ease",
                  }}
                  /* ИСПРАВЛЕНО: Заменили устаревший bodyStyle на современный styles.body для Ant Design */
                  styles={{ body: { padding: "24px", textAlign: "center" } }}
                >
                  <Text
                    strong
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#262626",
                      display: "block",
                    }}
                  >
                    {cat.name}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Раздел лучших мастеров */}
        <div style={{ padding: "60px 40px" }}>
          <Title level={3} style={{ fontWeight: 700, marginBottom: "40px" }}>
            <StarOutlined style={{ color: "#faad14", marginRight: "8px" }} />{" "}
            Лучшие мастера недели
          </Title>

          <Row gutter={[24, 24]}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Col xs={24} sm={12} md={8} key={i}>
                  <Card loading={true} style={{ borderRadius: "12px" }} />
                </Col>
              ))
            ) : topMasters.length === 0 ? (
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: "16px" }}>
                  В данный момент список мастеров обновляется администратором.
                </Text>
              </Col>
            ) : (
              topMasters.map((master) => (
                <Col xs={24} sm={12} md={8} key={master.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
                    }}
                    actions={[
                      <Button
                        type="link"
                        onClick={handleBookingClick}
                        style={{
                          color: "#faad14",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        Выбрать услуги и время
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar
                          size={70}
                          src={
                            master.avatarUrl
                              ? `${baseUrl}${master.avatarUrl}`
                              : undefined
                          }
                          icon={!master.avatarUrl && <UserOutlined />}
                          style={{ background: "#faad14" }}
                        />
                      }
                      title={
                        <span
                          style={{ fontSize: "18px", fontWeight: 600 }}
                        >{`${master.name} ${master.surname || ""}`}</span>
                      }
                      description={
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ marginTop: "5px", width: "100%" }}
                        >
                          <Tag
                            color="gold"
                            style={{ fontSize: "12px", padding: "2px 8px" }}
                          >
                            {master.jobTitle || "Специалист"}
                          </Tag>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "4px",
                            }}
                          >
                            <Rate
                              disabled
                              defaultValue={5}
                              style={{ fontSize: "13px" }}
                            />
                            <Text
                              type="secondary"
                              strong
                              style={{ fontSize: "13px" }}
                            >
                              (5.0)
                            </Text>
                          </div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </div>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "#f0f2f5",
          borderTop: "1px solid #e8e8e8",
          padding: "30px 20px",
        }}
      >
        <strong>Beauty Hub ©2026</strong> — Профессиональная CRM-платформа
        автоматизации сферы услуг
      </Footer>
    </Layout>
  );
}
