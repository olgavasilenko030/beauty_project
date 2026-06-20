import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
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
  Form,
  Select,
  Input,
  DatePicker,
  TimePicker,
  Row,
  Col,
  Spin,
} from "antd";
import {
  LogoutOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  CloseCircleOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

dayjs.extend(utc);

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface Client {
  id: number;
  name: string;
  surname?: string;
  phone?: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
}

interface Recording {
  id: number;
  appointmentTime: string;
  status: "Scheduled" | "Completed" | "Cancelled" | string;
  clientId?: number;
  serviceId?: number;
  client?: Client;
  service?: Service;
}

export default function MasterPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [selectedDateRecordings, setSelectedDateRecordings] = useState<
    Recording[]
  >([]);
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [editingRecord, setEditingRecord] = useState<Recording | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [recordForm] = Form.useForm();
  const [clientForm] = Form.useForm();

  const [masterProfile, setMasterProfile] = useState<any>(null); // ДОБАВЛЕНО: Стейт для хранения имени мастера

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const masterId = localStorage.getItem("linkedId");
  const bId = localStorage.getItem("businessId");
  const baseUrl = "https://localhost:7164";
  const fetchSchedule = () => {
    setLoading(true);
    axios
      .get(`${baseUrl}/api/Recordings/ForMaster/${masterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRecordings(res.data);
        if (selectedDateStr) {
          const updatedDay = res.data.filter((r: any) => {
            const recDate = dayjs(r.appointmentTime).format("DD.MM.YYYY");
            return recDate === selectedDateStr;
          });
          setSelectedDateRecordings(updatedDay);
        }
      })
      .catch(() => message.error("Ошибка загрузки расписания"))
      .finally(() => setLoading(false));
  };

  const fetchMetadata = async () => {
    try {
      const clientsRes = await axios.get(
        `${baseUrl}/api/Clients?businessId=${bId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setClients(clientsRes.data);

      const servicesRes = await axios.get(
        `${baseUrl}/api/Services?employeeId=${masterId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setServices(servicesRes.data);
    } catch {
      message.error("Ошибка при подгрузке системных справочников");
    }
  };

  // ХУК ЭФФЕКТА: Срабатывает автоматически при открытии страницы кабинета мастера
  useEffect(() => {
    // ЗАЩИТА РОУТА: Если токена нет ИЛИ роль в системе не "Master" — жестко выкидываем на страницу входа
    if (!token || localStorage.getItem("role") !== "Master") {
      navigate("/login");
      return;
    }

    // ==========================================
    // ДОБАВЛЕНО: Принудительный запрос имени мастера с бэкенда .NET Core
    // ==========================================
    axios
      .get(`${baseUrl}/api/Auth/profile`, {
        // Обязательно шлем токен в заголовках, иначе сервер вернет ошибку 401 Unauthorized
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMasterProfile(res.data); // Успешно сохраняем JSON профиля (имя, фамилию) в наш стейт
      })
      .catch((err) => {
        console.error("Не удалось подгрузить имя мастера:", err);
      });
    // ==========================================

    // Вызываем функции загрузки личного расписания мастера и общих справочников (метаданных)
    fetchSchedule();
    fetchMetadata();
  }, [navigate, masterId, token]); // Хук перезапустится, если изменится токен или ID мастера

  // ФУНКЦИЯ: Успешное завершение бьюти-сеанса (изменение статуса записи)
  const handleComplete = async (id: number) => {
    try {
      // Отправляем асинхронный PATCH-запрос на специальный эндпоинт Complete бэкенда.
      // PATCH используется потому, что мы не перезаписываем всю строку, а точечно меняем только одно поле Status = "Completed"
      await axios.patch(
        `${baseUrl}/api/Recordings/Complete/${id}`,
        {}, // Тело запроса пустое, так как ID передается прямо в строке URL
        {
          headers: { Authorization: `Bearer ${token}` }, // Авторизация мастера
        },
      );

      // Выводим красивое всплывающее уведомление об успехе
      message.success("Визит успешно завершен!");

      // Мгновенно перезапрашиваем расписание с сервера, чтобы статус записи на экране сразу сменился
      fetchSchedule();
    } catch {
      // Если сервер вернул ошибку, выводим предупреждение
      message.error("Не удалось завершить сессию");
    }
  };

  const handleCancelRecord = async (id: number) => {
    try {
      await axios.patch(
        `${baseUrl}/api/Recordings/Cancel/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      message.success("Запись успешно отменена");
      fetchSchedule();
    } catch {
      message.error("Не удалось отменить запись");
    }
  };
  // FIXED: Pure string formatting strategy to prevent local timezone subtraction
  const handleSaveRecord = async (values: any) => {
    // 1. Extract pure text strings from the pickers without letting dayjs adjust them
    const targetDate = values.date.format("YYYY-MM-DD");
    const targetTime = values.time.format("HH:mm:00");

    // 2. Combine into a strict ISO local text format (Crucial: NO "Z" on the end!)
    const localDateTimeString = `${targetDate}T${targetTime}`;

    const payload: any = {
      AppointmentTime: localDateTimeString, // Server receives exact string "10:00:00"
      EmploeeId: parseInt(masterId || "0"),
      ServiceId: values.serviceId,
      ClientId: values.clientId,
      Status: editingRecord ? editingRecord.status : "Scheduled",
    };

    try {
      if (editingRecord) {
        payload.Id = editingRecord.id;
        await axios.put(
          `${baseUrl}/api/Recordings/${editingRecord.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        message.success("Параметры сеанса обновлены!");
      } else {
        await axios.post(`${baseUrl}/api/Recordings`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Новый визит добавлен в журнал!");
      }
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      setEditingRecord(null);
      fetchSchedule();
    } catch (err: any) {
      message.error(err.response?.data || "Ошибка при сохранении сеанса");
    }
  };

  // ФУНКЦИЯ: Создание или редактирование карточки клиента в кабинете мастера
  const handleSaveClient = async (values: any) => {
    try {
      // 1. ОЧИСТКА НОМЕРА: Вырезаем из телефона скобки, дефисы и буквы
      const cleanedPhone = values.phone
        ? values.phone.replace(/\D/g, "")
        : "Контакты";

      // 2. СИСТЕМНЫЙ МАРКЕР: Получаем ID салона, к которому привязан мастер
      const activeBusinessId = localStorage.getItem("businessId") || "0";

      // Собираем телефон с невидимым префиксом салона (например, "bId_1_79991234567")
      const finalPhone =
        activeBusinessId !== "0"
          ? `bId_${activeBusinessId}_${cleanedPhone}`
          : cleanedPhone;

      // 3. ФОРМИРУЕМ PAYLOAD: Синхронизируем имена полей с требованиями C# бэкенда (PascalCase и Notes!)
      const payload = {
        Id: editingClient ? editingClient.id : 0, // Передаем ID или 0 для автоинкремента PostgreSQL
        Name: values.name,
        Surname: values.surname || "CRM",
        Notes: finalPhone, // ИСПРАВЛЕНО: Шлем строку с маркером СТРОГО в поле Notes, чтобы бэкенд её увидел!
        Discount: 0,
        IsBlocked: false,
      };

      // 4. ОПЕРАЦИЯ ОБНОВЛЕНИЯ (PUT)
      if (editingClient) {
        await axios.put(`${baseUrl}/api/Clients/${editingClient.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Карточка клиента обновлена!");
      }
      // 5. ОПЕРАЦИЯ СОЗДАНИЯ (POST)
      else {
        await axios.post(`${baseUrl}/api/Clients`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Новый клиент успешно добавлен в базу салона!");
      }

      // 6. СБРОС ИНТЕРФЕЙСА
      setIsClientModalOpen(false);
      clientForm.resetFields();
      setEditingClient(null);

      // Перезапрашиваем актуальную бьюти-базу с сервера
      if (typeof fetchMetadata === "function") {
        fetchMetadata();
      }
    } catch (err: any) {
      console.error("Ошибка сохранения у мастера:", err.response?.data);
      message.error(err.response?.data || "Ошибка при работе с базой клиентов");
    }
  };

  const getDayRecordings = (value: Dayjs) => {
    const formattedDate = value.format("YYYY-MM-DD");
    return recordings.filter(
      (r) => dayjs(r.appointmentTime).format("YYYY-MM-DD") === formattedDate,
    );
  };

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

          const timeStr = dayjs(item.appointmentTime).format("HH:mm");
          return (
            <li
              key={item.id}
              style={{
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                fontSize: "11px",
              }}
            >
              <Badge
                status={badgeStatus}
                text={`${timeStr} ${item.client?.name || "Гость"}`}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  const onSelectDate = (value: Dayjs) => {
    setCurrentDate(value);
    const dayData = getDayRecordings(value);
    setSelectedDateRecordings(dayData);
    setSelectedDateStr(value.format("DD.MM.YYYY"));
    setIsModalOpen(true);
  };

  const openCreateRecordModal = () => {
    setEditingRecord(null);
    recordForm.resetFields();
    recordForm.setFieldsValue({ date: currentDate });
    setIsRecordModalOpen(true);
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
          {/* ИСПРАВЛЕНО: Премиальное бьюти-приветствие с акцентом на имя мастера */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: "1.2",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#8c8c8c",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
              }}
            >
              Личный кабинет
            </span>
            <Title
              level={4}
              style={{ margin: 0, fontWeight: 800, color: "#262626" }}
            >
              ✨ Рады видеть вас,{" "}
              <span style={{ color: "#faad14" }}>
                {masterProfile?.name || masterProfile?.Name || "Мастер"}
              </span>
              !
            </Title>
          </div>
        </Space>

        <Space size="middle">
          <Button
            type="primary"
            style={{ background: "#faad14", borderColor: "#faad14" }}
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreateRecordModal}
          >
            Создать запись
          </Button>
          <Button
            icon={<UserAddOutlined />}
            size="large"
            onClick={() => {
              setEditingClient(null);
              clientForm.resetFields();
              setIsClientModalOpen(true);
            }}
          >
            Новый клиент
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
          styles={{ body: { padding: "20px" } }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px" }}>
              <Spin size="large" description="Синхронизация с базой CRM..." />
            </div>
          ) : (
            <Calendar cellRender={dateCellRender} onSelect={onSelectDate} />
          )}
        </Card>

        <Modal
          title={`Журнал посещений: ${selectedDateStr}`}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={650}
        >
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            style={{ marginBottom: 15 }}
            onClick={() => {
              setIsModalOpen(false);
              openCreateRecordModal();
            }}
          >
            Добавить сеанс на этот день
          </Button>
          <List
            itemLayout="horizontal"
            dataSource={selectedDateRecordings}
            locale={{ emptyText: "Записи на выбранный день отсутствуют" }}
            renderItem={(item) => {
              const itemTime = dayjs(item.appointmentTime).format("HH:mm");
              return (
                <List.Item style={{ padding: "12px 0" }}>
                  <Row style={{ width: "100%" }} align="middle">
                    <Col span={18}>
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
                    </Col>

                    {/* Вертикальный адаптивный стек кнопок управления */}
                    <Col span={6} style={{ textAlign: "right" }}>
                      <Space
                        direction="vertical"
                        size={4}
                        style={{ width: "100%" }}
                      >
                        {item.status === "Scheduled" && (
                          <Popconfirm
                            title="Завершить процедуру визита?"
                            onConfirm={() => handleComplete(item.id)}
                            okText="Да"
                            cancelText="Нет"
                          >
                            <Button
                              type="primary"
                              size="small"
                              block
                              icon={<CheckCircleOutlined />}
                              style={{
                                background: "#52c41a",
                                borderColor: "#52c41a",
                              }}
                            >
                              Выполнено
                            </Button>
                          </Popconfirm>
                        )}
                        {item.status === "Scheduled" && (
                          <Button
                            type="default"
                            size="small"
                            block
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingRecord(item);
                              recordForm.setFieldsValue({
                                clientId: item.clientId,
                                serviceId: item.serviceId,
                                date: dayjs(item.appointmentTime),
                                time: dayjs(item.appointmentTime),
                              });
                              setIsModalOpen(false);
                              setIsRecordModalOpen(true);
                            }}
                          >
                            Изменить
                          </Button>
                        )}
                        {item.status === "Scheduled" && (
                          <Popconfirm
                            title="Отменить бронирование сеанса?"
                            onConfirm={() => handleCancelRecord(item.id)}
                            okText="Да"
                            cancelText="Нет"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="primary"
                              danger
                              size="small"
                              block
                              icon={<CloseCircleOutlined />}
                            >
                              Отменить
                            </Button>
                          </Popconfirm>
                        )}
                        {item.status !== "Scheduled" && (
                          <Text
                            type="secondary"
                            italic
                            style={{
                              fontSize: "12px",
                              display: "block",
                              textAlign: "center",
                            }}
                          >
                            Журнал закрыт
                          </Text>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </List.Item>
              );
            }}
          />
        </Modal>

        <Modal
          title={
            editingRecord
              ? "Редактирование записи визита"
              : "Оформление новой записи"
          }
          open={isRecordModalOpen}
          onOk={() => recordForm.submit()}
          onCancel={() => setIsRecordModalOpen(false)}
          okText="Сохранить"
          cancelText="Отмена"
        >
          <Form form={recordForm} layout="vertical" onFinish={handleSaveRecord}>
            <Form.Item
              name="clientId"
              label="Выберите клиента"
              rules={[{ required: true, message: "Укажите клиента визита" }]}
            >
              <Select
                placeholder="Поиск клиента по имени..."
                showSearch
                optionFilterProp="children"
              >
                {clients.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name} {c.surname || ""} {c.phone ? `(${c.phone})` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="serviceId"
              label="Оказываемая услуга"
              rules={[{ required: true, message: "Укажите процедуру прайса" }]}
            >
              <Select placeholder="Прайс-лист ваших услуг">
                {services.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name} — {s.price} ₽
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Дата сеанса"
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="time"
                  label="Время начала"
                  rules={[{ required: true }]}
                >
                  <TimePicker
                    style={{ width: "100%" }}
                    format="HH:mm"
                    hideDisabledOptions
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title="Добавление клиента в базу"
          open={isClientModalOpen}
          onOk={() => clientForm.submit()}
          onCancel={() => setIsClientModalOpen(false)}
          okText="Сохранить"
          cancelText="Отмена"
        >
          <Form form={clientForm} layout="vertical" onFinish={handleSaveClient}>
            <Form.Item
              name="name"
              label="Имя клиента"
              rules={[{ required: true, message: "Введите имя" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="surname" label="Фамилия">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Контактный телефон">
              <Input placeholder="+7 (999) 000-00-00" />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
