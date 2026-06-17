import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Layout,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Avatar,
  Tag,
  Tabs,
  List,
  Space,
  Image,
  message,
  Rate,
} from "antd";

import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  StarOutlined,
  GlobalOutlined,
  InstagramOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function SalonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<any>(null);
  const [masters, setMasters] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const baseUrl = "https://localhost:7164";
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchSalonData = async () => {
      try {
        const salonRes = await axios.get(`${baseUrl}/api/Businesses/${id}`);
        setSalon(salonRes.data);

        try {
          const mastersRes = await axios.get(
            `${baseUrl}/api/Employees?businessId=${id}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          setMasters(mastersRes.data || []);
        } catch {
          setMasters([]);
        }

        try {
          const servicesRes = await axios.get(
            `${baseUrl}/api/Services?businessId=${id}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          setServices(servicesRes.data || []);
        } catch {
          setServices([]);
        }

        // ИСПРАВЛЕНО: Добавили скачивание реальных отзывов с бэкенда PostgreSQL!
        try {
          const reviewsRes = await axios.get(
            `${baseUrl}/api/Reviews/business/${id}`,
          );
          setReviews(reviewsRes.data || []); // Записываем массив отзывов в стейт
        } catch {
          setReviews([]); // Если отзывов нет, оставляем пустой массив
        }
      } catch (err) {
        console.error("Ошибка загрузки данных салона", err);
        message.error("Не удалось загрузить карточку салона");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchSalonData();
  }, [id, token]);

  const avgRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce((acc: any, r: any) => acc + r.rating, 0) /
          reviews.length
        ).toFixed(1)
      : "5.0";

  const handleBookingRedirect = (masterId?: number, serviceId?: number) => {
    if (token) {
      navigate("/client", {
        state: {
          autoBusinessId: salon.id,
          autoMasterId: masterId,
          autoServiceId: serviceId,
        },
      });
    } else {
      message.info("Для онлайн-записи необходимо войти в аккаунт клиента");
      navigate("/login", {
        state: { targetRole: "Client", returnTo: `/salon/${id}` },
      });
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #fef08a 0%, #fef9c3 100%)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  if (!salon)
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <Text strong style={{ color: "#92400e" }}>
          Салон не найден
        </Text>
      </div>
    );

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
        minHeight: "100vh",
        paddingBottom: "60px",
      }}
    >
      {/* Сочная Премиум-шапка в тон SalonsPage */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          padding: "50px 20px",
          borderBottom: "4px solid #faad14",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/salons")}
            style={{
              marginBottom: 24,
              borderRadius: "10px",
              fontWeight: 600,
              background: "transparent",
              color: "#fff",
              border: "2px solid #faad14",
            }}
          >
            Назад в каталог
          </Button>
          <Row gutter={[32, 24]} align="middle">
            <Col xs={24} md={4} style={{ textAlign: "center" }}>
              {salon.logoUrl ? (
                <img
                  src={`${baseUrl}${salon.logoUrl}`}
                  alt="logo"
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "24px",
                    objectFit: "cover",
                    border: "3px solid #fef3c7",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                />
              ) : (
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  style={{ border: "4px solid #334155", background: "#faad14" }}
                />
              )}
            </Col>
            <Col xs={24} md={14}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <Title
                  level={1}
                  style={{
                    color: "#fff",
                    margin: 0,
                    fontWeight: 900,
                    fontSize: "32px",
                  }}
                >
                  {salon.name}
                </Title>
                <Tag
                  color="gold"
                  style={{ fontWeight: 700, borderRadius: 6, fontSize: 18 }}
                >
                  ★ {avgRating}
                </Tag>
              </div>
              <Paragraph
                style={{
                  color: "#94a3b8",
                  marginTop: 8,
                  fontSize: 15,
                  lineHeight: "1.5",
                }}
              >
                {salon.description ||
                  "Профессиональное бьюти-пространство с уютным интерьером, топ-мастерами и премиальным сервисом."}
              </Paragraph>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "20px",
                  fontSize: "14px",
                  color: "#cbd5e1",
                  fontWeight: 500,
                  marginTop: "12px",
                }}
              >
                <span>
                  <EnvironmentOutlined style={{ color: "#e11d48" }} />{" "}
                  {salon.address}
                </span>
                <span>
                  <ClockCircleOutlined style={{ color: "#059669" }} />{" "}
                  {salon.workingHours || "09:00 - 21:00"}
                </span>
                <span>
                  <PhoneOutlined style={{ color: "#2563eb" }} /> {salon.phone}
                </span>
              </div>
            </Col>
            <Col xs={24} md={6} style={{ textAlign: "right" }}>
              <Button
                type="primary"
                size="large"
                onClick={() => handleBookingRedirect()}
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  borderColor: "#d97706",
                  height: 52,
                  borderRadius: "14px",
                  fontWeight: 800,
                  width: "100%",
                  boxShadow: "0 6px 20px rgba(245,158,11,0.4)",
                  color: "#fff",
                }}
              >
                Быстрая онлайн-запись
              </Button>
            </Col>
          </Row>
        </div>
      </div>
      {/* Яркий информационный блок о самом салоне */}
      <div
        style={{
          maxWidth: 1100,
          margin: "35px auto 0 auto",
          padding: "0 20px",
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Слева: Рабочие дни и Социальные сети */}
          <Col xs={24} md={10}>
            <Card
              style={{
                borderRadius: "16px",
                border: "2px solid #fef3c7",
                boxShadow: "0 8px 24px rgba(217,119,6,0.04)",
                height: "100%",
              }}
            >
              <Title
                level={4}
                style={{ color: "#451a03", fontWeight: 800, marginBottom: 16 }}
              >
                🗓️ График и контакты
              </Title>
              <div style={{ marginBottom: 20 }}>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 4 }}
                >
                  Рабочие дни студии:
                </Text>
                {salon.workingDays && salon.workingDays.length > 0 ? (
                  <Space wrap size={[8, 8]}>
                    {salon.workingDays.map((day: string, i: number) => (
                      <Tag
                        key={i}
                        color="warning"
                        style={{ fontWeight: 700, borderRadius: "6px" }}
                      >
                        {day}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Tag
                    color="warning"
                    style={{ fontWeight: 700, borderRadius: "6px" }}
                  >
                    Пн - Вс (Без выходных)
                  </Tag>
                )}
              </div>

              {salon.socialLinks && (
                <div>
                  <Text
                    type="secondary"
                    style={{ display: "block", marginBottom: 8 }}
                  >
                    Мы в социальных сетях:
                  </Text>
                  <Space size="middle">
                    <Button
                      type="primary"
                      shape="round"
                      icon={<GlobalOutlined />}
                      href={salon.socialLinks}
                      target="_blank"
                      style={{
                        background: "#4c75a3",
                        borderColor: "#4c75a3",
                        fontWeight: 600,
                      }}
                    >
                      ВКонтакте
                    </Button>
                  </Space>
                </div>
              )}
            </Card>
          </Col>

          {/* Справа: Фотографии интерьера студии */}
          <Col xs={24} md={14}>
            <Card
              style={{
                borderRadius: "16px",
                border: "2px solid #fef3c7",
                boxShadow: "0 8px 24px rgba(217,119,6,0.04)",
                height: "100%",
              }}
            >
              <Title
                level={4}
                style={{ color: "#451a03", fontWeight: 800, marginBottom: 16 }}
              >
                ✨ Атмосфера нашего салона
              </Title>
              {salon.interiorPhotos && salon.interiorPhotos.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    maxHeight: "140px",
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  <Image.PreviewGroup>
                    {salon.interiorPhotos.map((photo: string, i: number) => (
                      <div
                        key={i}
                        style={{
                          width: "90px",
                          height: "65px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Image
                          src={`${baseUrl}${photo}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    ))}
                  </Image.PreviewGroup>
                </div>
              ) : (
                <div
                  style={{
                    background: "#fffbeb",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px dashed #faad14",
                    color: "#b45309",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  Фотографии интерьера бьюти-пространства скоро появятся
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
      {/* Контентные вкладки: Специалисты, Прайс-лист, Работы */}
      <div
        style={{
          maxWidth: 1100,
          width: "100%",
          margin: "35px auto 0 auto",
          padding: "0 20px",
        }}
      >
        <Card
          style={{
            borderRadius: "20px",
            border: "2px solid #fef3c7",
            boxShadow: "0 10px 30px rgba(217,119,6,0.05)",
            background: "#fff",
          }}
        >
          <Tabs
            defaultActiveKey="1"
            size="large"
            animated={true}
            items={[
              {
                key: "1",
                label: "✨ Специалисты",
                children: (
                  <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
                    {masters.map((m) => (
                      <Col xs={24} sm={12} md={8} key={m.id}>
                        <Card
                          hoverable
                          style={{
                            borderRadius: "16px",
                            border: "1px solid #f1f5f9",
                            textAlign: "center",
                            overflow: "hidden",
                            background: "#fffbeb",
                          }}
                          actions={[
                            <Button
                              type="link"
                              onClick={() => handleBookingRedirect(m.id)}
                              style={{
                                color: "#d97706",
                                fontWeight: 700,
                                fontSize: "14px",
                              }}
                            >
                              Выбрать мастера
                            </Button>,
                          ]}
                        >
                          {/* ИСПРАВЛЕНО: Теперь аватарка мастера кликабельна и увеличивается на весь экран! */}
                          <div
                            style={{
                              marginBottom: 14,
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            {m.avatarUrl ? (
                              <div
                                style={{
                                  width: "90px",
                                  height: "90px",
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  border: "3px solid #fff",
                                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                                }}
                              >
                                <Image
                                  src={`${baseUrl}${m.avatarUrl}`}
                                  alt="master"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            ) : (
                              <Avatar
                                size={90}
                                icon={<UserOutlined />}
                                style={{
                                  background: "#fbbf24",
                                  border: "3px solid #fff",
                                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                                }}
                              />
                            )}
                          </div>
                          <Title
                            level={4}
                            style={{
                              margin: 0,
                              color: "#451a03",
                              fontWeight: 800,
                            }}
                          >{`${m.name} ${m.surname || ""}`}</Title>
                          <Tag
                            color="warning"
                            style={{
                              marginTop: 8,
                              fontWeight: 700,
                              borderRadius: "6px",
                            }}
                          >
                            {m.jobTitle || "Специалист"}
                          </Tag>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
              },
              {
                key: "2",
                label: "💅 Прайс-лист",
                children: (
                  <List
                    style={{ marginTop: 16 }}
                    itemLayout="horizontal"
                    dataSource={services}
                    renderItem={(s) => (
                      <List.Item
                        style={{ textAlign: "left" }}
                        extra={
                          <Space size="large">
                            <Text
                              strong
                              style={{
                                fontSize: "18px",
                                color: "#b45309",
                              }}
                            >
                              {s.price} ₽
                            </Text>
                            <Button
                              type="primary"
                              onClick={() =>
                                handleBookingRedirect(undefined, s.id)
                              }
                              style={{
                                background:
                                  "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                                borderColor: "#d97706",
                                borderRadius: "10px",
                                fontWeight: 700,
                              }}
                            >
                              Записаться
                            </Button>
                          </Space>
                        }
                      >
                        <List.Item.Meta
                          title={
                            <Text
                              strong
                              style={{
                                fontSize: "16px",
                                color: "#451a03",
                                display: "block",
                                textAlign: "left",
                              }}
                            >
                              {s.name}
                            </Text>
                          }
                          description={
                            <span
                              style={{
                                color: "#78350f",
                                display: "block",
                                textAlign: "left",
                              }}
                            >
                              <ClockCircleOutlined
                                style={{ color: "#059669" }}
                              />{" "}
                              Длительность: {s.duration} мин
                            </span>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: "3",
                label: "📸 Галерея работ",
                children: (
                  <div style={{ marginTop: 16 }}>
                    <Title
                      level={4}
                      style={{
                        marginBottom: 20,
                        color: "#451a03",
                        fontWeight: 800,
                      }}
                    >
                      Галерея лучших работ наших специалистов
                    </Title>
                    <Row gutter={[16, 16]}>
                      <Image.PreviewGroup>
                        {masters
                          .flatMap((m) => m.portfolioPhotos || [])
                          .map((photo, i) => (
                            <Col xs={12} sm={8} md={6} key={i}>
                              <div
                                style={{
                                  borderRadius: "14px",
                                  overflow: "hidden",
                                  border: "2px solid #fff",
                                  height: "180px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                }}
                              >
                                <Image
                                  src={`${baseUrl}${photo}`}
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
                  </div>
                ),
              },
              {
                key: "4",
                label: `💬 Отзывы (${reviews.length})`,
                children: (
                  <List
                    itemLayout="horizontal"
                    dataSource={reviews}
                    renderItem={(r: any) => (
                      <List.Item
                        style={{
                          padding: "16px 0",
                          borderBottom: "1px solid #f1f5f9",
                          textAlign: "left",
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<UserOutlined />}
                              style={{ background: "#faad14" }}
                            />
                          }
                          title={
                            <Space size="middle">
                              <Text
                                strong
                                style={{
                                  color: "#451a03",
                                  fontSize: "15px",
                                  textAlign: "left",
                                }}
                              >
                                {r.clientName}
                              </Text>
                              <Rate
                                disabled
                                defaultValue={r.rating}
                                style={{
                                  fontSize: "12px",
                                  color: "#faad14",
                                  textAlign: "left",
                                }}
                              />
                            </Space>
                          }
                          description={
                            <div
                              style={{ marginTop: "4px", textAlign: "left" }}
                            >
                              <Paragraph
                                style={{
                                  color: "#78350f",
                                  fontSize: "14px",
                                  marginBottom: "4px",
                                }}
                              >
                                {r.comment}
                              </Paragraph>
                              <Text
                                type="secondary"
                                style={{ fontSize: "11px" }}
                              >
                                {new Date(r.createdAt).toLocaleDateString(
                                  "ru-RU",
                                )}
                              </Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
