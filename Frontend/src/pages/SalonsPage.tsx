import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Tag,
  Button,
  Input,
  Space,
} from "antd";
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  StarOutlined,
  RightOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function SalonsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const categoryParam = searchParams.get("category");
  const baseUrl = "https://localhost:7164";

  useEffect(() => {
    const fetchFilteredSalons = async () => {
      setLoading(true);
      try {
        let response;
        if (categoryParam) {
          response = await axios.get(
            `${baseUrl}/api/Businesses/by-category?category=${categoryParam}`,
          );
        } else {
          response = await axios.get(`${baseUrl}/api/Businesses`);
        }
        setSalons(response.data);
      } catch (error) {
        console.error("Ошибка загрузки каталога салонов", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredSalons();
  }, [categoryParam]);

  const filteredSalons = salons.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
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
        <Text
          style={{
            marginTop: 16,
            fontSize: 18,
            fontWeight: 700,
            color: "#854d0e",
          }}
        >
          Ищем лучшие студии красоты...
        </Text>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
        minHeight: "100vh",
        padding: "50px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Контрастный и яркий Хедер */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "normal",
            marginBottom: 40,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
            style={{
              borderRadius: "10px",
              fontWeight: 600,
              height: "42px",
              border: "2px solid #faad14",
              color: "#d97706",
            }}
          >
            На главную
          </Button>
          <Input
            placeholder="Введите название или адрес студии..."
            prefix={
              <SearchOutlined style={{ color: "#faad14", fontSize: "16px" }} />
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: 380,
              borderRadius: "12px",
              height: "45px",
              border: "2px solid #fde047",
              boxShadow: "0 4px 12px rgba(250,173,20,0.08)",
            }}
          />
        </div>

        {/* Заголовок с эффектом свежести */}
        <div style={{ marginBottom: 35 }}>
          <Tag
            color="warning"
            style={{
              fontSize: "13px",
              padding: "4px 14px",
              borderRadius: "20px",
              fontWeight: 700,
              marginBottom: "12px",
              background: "#fef3c7",
              borderColor: "#faad14",
              color: "#b45309",
            }}
          >
            ✨ ЛУЧШИЙ ВЫБОР В ГОРОДЕ
          </Tag>
          <Title
            level={1}
            style={{
              fontWeight: 900,
              color: "#78350f",
              margin: 0,
              fontSize: "36px",
              letterSpacing: "-0.5px",
            }}
          >
            {categoryParam
              ? "Доступные студии красоты"
              : "Все бьюти-пространства"}
          </Title>
          <Text style={{ fontSize: "16px", color: "#92400e", fontWeight: 500 }}>
            Найдено {filteredSalons.length} сочных локаций для твоей записи
          </Text>
        </div>

        {filteredSalons.length === 0 ? (
          <Empty
            description={
              <Text strong style={{ color: "#92400e" }}>
                Ничего не найдено. Попробуй ввести другое название!
              </Text>
            }
            style={{ marginTop: 80 }}
          />
        ) : (
          <Row gutter={[0, 24]}>
            {filteredSalons.map((salon) => (
              <Col xs={24} key={salon.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: "20px",
                    overflow: "hidden",
                    border: "2px solid #fef3c7",
                    boxShadow: "0 10px 30px rgba(217,119,6,0.06)",
                    background: "#fff",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                >
                  <Row gutter={[24, 24]} align="middle">
                    {/* Яркий логотип/заглушка */}
                    <Col
                      xs={24}
                      sm={6}
                      style={{ display: "flex", justifyContent: "left" }}
                    >
                      {salon.logoUrl ? (
                        <img
                          src={`${baseUrl}${salon.logoUrl}`}
                          alt="logo"
                          style={{
                            width: "130px",
                            height: "130px",
                            borderRadius: "20px",
                            objectFit: "cover",
                            border: "3px solid #fef3c7",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "130px",
                            height: "130px",
                            borderRadius: "20px",
                            background:
                              "linear-gradient(135deg, #fef3c7 0%, #fde047 100%)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "left",
                            border: "2px dashed #faad14",
                          }}
                        >
                          <StarOutlined
                            style={{ fontSize: "44px", color: "#d97706" }}
                          />
                        </div>
                      )}
                    </Col>

                    {/* Насыщенный текстовый контент */}
                    <Col xs={24} sm={13}>
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <Title
                            level={3}
                            style={{
                              margin: 0,
                              fontWeight: 800,
                              color: "#451a03",
                              fontSize: "24px",
                            }}
                          >
                            {salon.name}
                          </Title>
                          <Tag
                            color="gold"
                            style={{
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "18px",
                              padding: "2px 10px",
                              background: "#fff7ed",
                              border: "1px solid #faad14",
                              color: "#c2410c",
                            }}
                          >
                            ★{" "}
                            {salon.rating
                              ? salon.rating.toFixed(1)
                              : "5.0"}{" "}
                          </Tag>
                        </div>
                        <Paragraph
                          style={{
                            margin: "6px 0",
                            fontSize: "15px",
                            color: "#78350f",
                            lineHeight: "1.5",
                            textAlign: "left",
                          }}
                          ellipsis={{ rows: 2 }}
                        >
                          {salon.description ||
                            "Профессиональная студия красоты с уютным интерьером, топ-мастерами и вкусным кофе для каждого гостя."}
                        </Paragraph>

                        {/* Сочные иконки контактов */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "20px",
                            fontSize: "14px",
                            color: "#92400e",
                            fontWeight: 600,
                            marginTop: "6px",
                          }}
                        >
                          <span>
                            <EnvironmentOutlined
                              style={{ color: "#e11d48", fontSize: "16px" }}
                            />{" "}
                            {salon.address}
                          </span>
                          <span>
                            <ClockCircleOutlined
                              style={{ color: "#059669", fontSize: "16px" }}
                            />{" "}
                            {salon.workingHours || "09:00 - 21:00"}
                          </span>
                          <span>
                            <PhoneOutlined
                              style={{ color: "#2563eb", fontSize: "16px" }}
                            />{" "}
                            {salon.phone}
                          </span>
                        </div>
                      </Space>
                    </Col>

                    {/* Акцентная сочная Кнопка записи */}
                    <Col xs={24} sm={5} style={{ textAlign: "right" }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<RightOutlined />}
                        style={{
                          background:
                            "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                          borderColor: "#d97706",
                          borderRadius: "14px",
                          fontWeight: 800,
                          height: "52px",
                          padding: "0 28px",
                          boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
                          color: "#fff",
                        }}
                      >
                        Записаться
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
