import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import {
  Table,
  Layout,
  Card,
  Form,
  Input,
  Button,
  message,
  Modal,
  Space,
  InputNumber,
  TimePicker,
  Typography,
  Tabs,
  Tag,
  Upload,
  Spin,
  Popconfirm,
  Checkbox,
  Row,
  Col,
} from "antd";
import {
  LogoutOutlined,
  UserAddOutlined,
  KeyOutlined,
  PlusCircleOutlined,
  TeamOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  SaveOutlined,
  LoadingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ScissorOutlined,
  PhoneOutlined,
  GlobalOutlined,
  SearchOutlined,
  PictureOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AdminPage() {
  const [business, setBusiness] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [interiorFileList, setInteriorFileList] = useState<any[]>([]);

  // Состояния для живого поиска
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchClient, setSearchClient] = useState("");

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);

  const [employeeForm] = Form.useForm();
  const [serviceForm] = Form.useForm();
  const [accessForm] = Form.useForm();
  const [salonForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editServiceForm] = Form.useForm();

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const bId = localStorage.getItem("businessId");
  const role = localStorage.getItem("role");
  const baseUrl = "https://localhost:7164";

  const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const fetchEmployees = () => {
    axios
      .get(`${baseUrl}/api/Employees?businessId=${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      .catch(() => message.error("Ошибка загрузки списка мастеров"));
  };

  const fetchClients = async () => {
    if (!bId || bId === "0") return;
    try {
      const cRes = await axios.get(`${baseUrl}/api/Clients?businessId=${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(cRes.data);
    } catch (error: any) {
      console.error(
        "Детали ошибки загрузки базы клиентов:",
        error.response?.data,
      );
      message.error("Ошибка загрузки базы клиентов");
    }
  };

  const fetchAllData = async () => {
    if (!bId || bId === "0") return;
    setLoading(true);
    try {
      const bRes = await axios.get(`${baseUrl}/api/Businesses/${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBusiness(bRes.data);

      let initialHours: any = null;
      if (bRes.data.workingHours && bRes.data.workingHours.includes(" - ")) {
        const parts = bRes.data.workingHours.split(" - ");
        initialHours = [dayjs(parts[0], "HH:mm"), dayjs(parts[1], "HH:mm")];
      }

      salonForm.setFieldsValue({
        name: bRes.data.name,
        address:
          bRes.data.address === "Адрес не указан" ? "" : bRes.data.address,
        phone: bRes.data.phone,
        description: bRes.data.description,
        workingDays: bRes.data.workingDays || [],
        workingHoursRange: initialHours,
        vk: bRes.data.socialLinks?.[0] || "",
        instagram: bRes.data.socialLinks?.[1] || "",
      });

      if (bRes.data.logoUrl) {
        const cleanPath = bRes.data.logoUrl.startsWith("/")
          ? bRes.data.logoUrl
          : `/${bRes.data.logoUrl}`;
        setLogoUrl(`${baseUrl}${cleanPath}`);
      }

      if (bRes.data.interiorPhotos) {
        setInteriorFileList(
          bRes.data.interiorPhotos.map((url: string, index: number) => {
            const cleanPath = url.startsWith("/") ? url : `/${url}`;
            return {
              uid: index.toString(),
              name: `photo-${index}.jpg`,
              status: "done",
              url: `${baseUrl}${cleanPath}`,
            };
          }),
        );
      }

      fetchEmployees();
      await fetchClients();
    } catch {
      message.error("Ошибка при инициализации панели администратора");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || (role !== "Admin" && role !== "Owner")) {
      navigate("/login");
    } else {
      fetchAllData();
    }
  }, [bId]);

  const handleSaveSalonInfo = async (values: any) => {
    try {
      const hoursString = values.workingHoursRange
        ? `${values.workingHoursRange[0].format("HH:mm")} - ${values.workingHoursRange[1].format("HH:mm")}`
        : "09:00 - 21:00";

      const payload = {
        ...business,
        Name: values.name,
        Address: values.address || "Адрес не указан",
        Phone: values.phone,
        Description: values.description,
        WorkingHours: hoursString,
        WorkingDays: values.workingDays,
        SocialLinks: [values.vk || "", values.instagram || ""],
      };

      await axios.put(`${baseUrl}/api/Businesses/${bId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Данные салона успешно обновлены!");
      fetchAllData();
    } catch {
      message.error("Ошибка сохранения данных");
    }
  };

  const handleLogoChange = (info: any) => {
    if (info.file.status === "uploading") {
      setLoadingLogo(true);
      return;
    }
    if (
      info.file.status === "done" ||
      (info.file.response && info.file.response.url)
    ) {
      const serverPath = info.file.response.url;
      const cleanPath = serverPath.startsWith("/")
        ? serverPath
        : `/${serverPath}`;
      setLogoUrl(`${baseUrl}${cleanPath}`);
      setLoadingLogo(false);
      message.success("Логотип салона успешно сохранен!");
    } else if (info.file.status === "error") {
      setLoadingLogo(false);
      message.error("Ошибка при сохранении вывески");
    }
  };

  const handleInteriorChange = (info: any) => {
    setInteriorFileList([...info.fileList]);
    if (info.file.status === "done") {
      message.success("Фото интерьера загружено!");
      fetchAllData();
    }
  };

  const handleRemoveInterior = async (file: any) => {
    const relativePath = file.url ? file.url.replace(baseUrl, "") : "";
    try {
      await axios.delete(
        `${baseUrl}/api/Businesses/delete-interior/${bId}?photoUrl=${encodeURIComponent(relativePath)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success("Фото удалено из галереи салона");
      return true;
    } catch {
      message.error("Не удалось удалить фото на сервере");
      return false;
    }
  };

  const handleToggleBlock = async (clientId: number) => {
    try {
      const res = await axios.patch(
        `${baseUrl}/api/Clients/ToggleBlock/${clientId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success(res.data.message);
      fetchClients();
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          "Не удалось изменить статус блокировки",
      );
    }
  };

  const handleAddService = async (values: any) => {
    const payload = {
      name: values.name,
      Name: values.name,
      price: values.price,
      Price: values.price,
      duration: values.duration.format("HH:mm:00"),
      Duration: values.duration.format("HH:mm:00"),
      emploeeId: selectedEmployee.id,
      EmploeeId: selectedEmployee.id,
      businessId: parseInt(bId || "0"),
      BusinessId: parseInt(bId || "0"),
    };
    try {
      await axios.post(`${baseUrl}/api/Services`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Услуга добавлена!");
      setIsServiceModalOpen(false);
      serviceForm.resetFields();
      fetchEmployees();
    } catch {
      message.error("Ошибка сохранения услуги");
    }
  };

  const handleEditService = async (values: any) => {
    const payload = {
      Id: selectedService.id,
      Name: values.name,
      Price: values.price,
      Duration: values.duration.format("HH:mm:00"),
      EmploeeId: selectedService.emploeeId,
      BusinessId: selectedService.businessId,
    };
    try {
      await axios.put(
        `${baseUrl}/api/Services/${selectedService.id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      message.success("Параметры услуги обновлены!");
      setIsEditServiceModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      message.error(
        err.response?.data || "Не удалось сохранить изменения услуги",
      );
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      const res = await axios.delete(`${baseUrl}/api/Services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(res.data.message || "Услуга удалена!");
      fetchEmployees();
    } catch {
      message.error("Не удалось удалить услугу");
    }
  };

  const handleCreateAccess = async (values: any) => {
    const payload = {
      Email: values.email,
      Password: values.password,
      EmployeeId: selectedEmployee.id,
      BusinessId: parseInt(bId || "0"),
    };
    try {
      await axios.post(`${baseUrl}/api/Auth/create-master-access`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Доступ активирован!");
      setIsAccessModalOpen(false);
      accessForm.resetFields();
    } catch {
      message.error("Ошибка при создании доступа");
    }
  };

  const handleEditEmployee = async (values: any) => {
    const payload = {
      Id: selectedEmployee.id,
      Name: values.name,
      Surname: values.surname,
      JobTitle: values.jobTitle,
      Phone: values.phone,
      BusinessId: selectedEmployee.businessId || parseInt(bId || "0"),
      EmployeeServices: selectedEmployee.employeeServices || "Master",
    };
    try {
      await axios.put(
        `${baseUrl}/api/Employees/${selectedEmployee.id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      message.success("Данные сотрудника изменены!");
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch {
      message.error("Не удалось сохранить изменения");
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/Employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Сотрудник удален из штата");
      fetchEmployees();
    } catch (error: any) {
      message.error(error.response?.data || "Ошибка при удалении");
    }
  };

  const employeeColumns = [
    {
      title: "Имя",
      dataIndex: "name",
      key: "name",
      render: (n: string) => <strong>{n}</strong>,
    },
    {
      title: "Фамилия",
      dataIndex: "surname",
      key: "surname",
      render: (s: string) => s || "—",
    },
    { title: "Должность", dataIndex: "jobTitle", key: "jobTitle" },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      render: (p: string) => p || "—",
    },
    {
      title: "Действия",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="primary"
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => {
              setSelectedEmployee(record);
              setIsServiceModalOpen(true);
            }}
          >
            Услуга
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => {
              setSelectedEmployee(record);
              setIsAccessModalOpen(true);
            }}
          >
            Доступ
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEmployee(record);
              editForm.setFieldsValue(record);
              setIsEditModalOpen(true);
            }}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Уволить мастера?"
            onConfirm={() => handleDeleteEmployee(record.id)}
            okText="Да"
            cancelText="Нет"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const clientColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Имя", dataIndex: "name", key: "name" },
    {
      title: "Фамилия",
      dataIndex: "surname",
      key: "surname",
      render: (s: string) => s || "—",
    },
    { title: "Email аккаунта", dataIndex: "email", key: "email" },
    {
      title: "Статус",
      dataIndex: "isBlocked",
      render: (b: boolean) =>
        b ? (
          <Tag color="red">ЗАБЛОКИРОВАН</Tag>
        ) : (
          <Tag color="green">АКТИВЕН</Tag>
        ),
    },
    {
      title: "Действие",
      key: "action",
      render: (_: any, r: any) => (
        <Button
          type={r.isBlocked ? "default" : "primary"}
          danger={!r.isBlocked}
          icon={r.isBlocked ? <CheckCircleOutlined /> : <StopOutlined />}
          onClick={() => handleToggleBlock(r.id)}
        >
          {r.isBlocked ? "Разблокировать" : "Заблокировать"}
        </Button>
      ),
    },
  ];

  const filteredEmployeesList = employees.filter((e) => {
    const searchString =
      `${e.name || ""} ${e.surname || ""} ${e.jobTitle || ""}`.toLowerCase();
    return searchString.includes(searchEmployee.toLowerCase());
  });

  const filteredClientsList = clients.filter((c) => {
    const searchString =
      `${c.name || ""} ${c.surname || ""} ${c.email || ""}`.toLowerCase();
    return searchString.includes(searchClient.toLowerCase());
  });

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <Spin size="large" description="Загрузка панели..." />
      </div>
    );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#001529",
          color: "white",
          display: "flex",
          justifyContent: "space-between", // ИСПРАВЛЕНО: строго валидное CSS-свойство
          alignItems: "center", // Выравнивает элементы ровно по вертикали
          padding: "0 20px",
        }}
      >
        <Title level={4} style={{ color: "white", margin: 0 }}>
          BEAUTY HUB: Управление бизнесом
        </Title>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          Выйти
        </Button>
      </Header>

      <Content style={{ padding: "24px" }}>
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: (
                <span>
                  <ShopOutlined />
                  Данные салона
                </span>
              ),
              children: (
                <Row gutter={24}>
                  <Col xs={24} md={14}>
                    <Card
                      title="Основная информация компании"
                      style={{ borderRadius: 12 }}
                    >
                      <Form
                        form={salonForm}
                        layout="vertical"
                        onFinish={handleSaveSalonInfo}
                      >
                        <Form.Item
                          name="name"
                          label="Название салона/студии"
                          rules={[{ required: true }]}
                        >
                          <Input size="large" />
                        </Form.Item>
                        <Form.Item name="address" label="Фактический адрес">
                          <Input
                            size="large"
                            placeholder="Укажите адрес салона (например: ул. Ленина, д. 10)"
                          />
                        </Form.Item>
                        <Form.Item
                          name="phone"
                          label="Контактный телефон организации"
                        >
                          <Input
                            size="large"
                            prefix={<PhoneOutlined />}
                            placeholder="+7 (999) 000-00-00"
                          />
                        </Form.Item>
                        <Form.Item
                          name="description"
                          label="Описание салона (будет видно клиентам)"
                        >
                          <TextArea
                            rows={4}
                            placeholder="Расскажите о преимуществах вашей студии, атмосфере..."
                          />
                        </Form.Item>
                        <Form.Item
                          name="workingDays"
                          label="Рабочие дни недели"
                        >
                          <Checkbox.Group options={daysOfWeek} />
                        </Form.Item>
                        <Form.Item
                          name="workingHoursRange"
                          label="Режим работы по часам"
                        >
                          <TimePicker.RangePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>

                        <Title level={5} style={{ marginTop: 20 }}>
                          <GlobalOutlined /> Социальные сети
                        </Title>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="vk" label="Ссылка на ВКонтакте">
                              <Input placeholder="https://vk.com..." />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="instagram"
                              label="Ссылка на Instagram"
                            >
                              <Input placeholder="https://instagram.com..." />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          size="large"
                          icon={<SaveOutlined />}
                          style={{
                            background: "#faad14",
                            border: "none",
                            height: 45,
                            marginTop: 10,
                          }}
                        >
                          Сохранить данные салона
                        </Button>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} md={10}>
                    <Card
                      title="Логотип и Фото интерьера"
                      style={{ marginBottom: 20 }}
                    >
                      <div style={{ textAlign: "center", marginBottom: 25 }}>
                        <Text strong>Логотип (Вывеска)</Text>
                        <div style={{ marginTop: 15 }}>
                          <Upload
                            name="file"
                            listType="picture-circle"
                            showUploadList={false}
                            action={`${baseUrl}/api/Businesses/upload-logo/${bId}`}
                            headers={{ Authorization: `Bearer ${token}` }}
                            onChange={handleLogoChange}
                          >
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt="logo"
                                style={{
                                  width: "100%",
                                  borderRadius: "50%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div>
                                {loadingLogo ? (
                                  <LoadingOutlined />
                                ) : (
                                  <PlusOutlined />
                                )}
                                <div style={{ marginTop: 8 }}>Вывеска</div>
                              </div>
                            )}
                          </Upload>
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid #f0f0f0",
                          paddingTop: 20,
                        }}
                      >
                        <Text strong>Фотогалерея интерьера студии</Text>
                        <div style={{ marginTop: 15 }}>
                          <Upload
                            action={`${baseUrl}/api/Businesses/upload-interior/${bId}`}
                            headers={{ Authorization: `Bearer ${token}` }}
                            listType="picture-card"
                            fileList={interiorFileList}
                            onChange={handleInteriorChange}
                            onRemove={handleRemoveInterior}
                          >
                            {interiorFileList.length >= 8 ? null : (
                              <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Добавить</div>
                              </div>
                            )}
                          </Upload>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "2",
              label: (
                <span>
                  <TeamOutlined />
                  Сотрудники
                </span>
              ),
              children: (
                <>
                  <Card
                    title="Зарегистрировать нового сотрудника"
                    style={{ marginBottom: 20 }}
                  >
                    <Form
                      form={employeeForm}
                      layout="inline"
                      onFinish={(v) => {
                        axios
                          .post(
                            `${baseUrl}/api/Employees`,
                            {
                              ...v,
                              businessId: bId,
                              employeeServices: "Master",
                            },
                            { headers: { Authorization: `Bearer ${token}` } },
                          )
                          .then(() => {
                            message.success("Мастер добавлен");
                            fetchEmployees();
                            employeeForm.resetFields();
                          });
                      }}
                    >
                      <Form.Item
                        name="name"
                        rules={[{ required: true, message: "Введите имя" }]}
                      >
                        <Input placeholder="Имя мастера" />
                      </Form.Item>
                      <Form.Item name="surname">
                        <Input placeholder="Фамилия мастера" />
                      </Form.Item>
                      <Form.Item
                        name="jobTitle"
                        rules={[
                          { required: true, message: "Укажите должность" },
                        ]}
                      >
                        <Input placeholder="Должность" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit">
                        В штат
                      </Button>
                    </Form>
                  </Card>
                  <Card
                    title="Команда мастеров"
                    extra={
                      <Input
                        placeholder="Поиск мастера по ФИО или должности..."
                        prefix={<SearchOutlined />}
                        value={searchEmployee}
                        onChange={(e) => setSearchEmployee(e.target.value)}
                        style={{ width: 300 }}
                      />
                    }
                  >
                    <Table
                      dataSource={filteredEmployeesList}
                      columns={employeeColumns}
                      rowKey="id"
                      expandable={{
                        expandedRowRender: (record: any) => {
                          const portfolioList = (
                            record.portfolioPhotos || []
                          ).map((url: string, idx: number) => {
                            const cleanPath = url.startsWith("/")
                              ? url
                              : `/${url}`;
                            return {
                              uid: idx.toString(),
                              name: `work-${idx}.jpg`,
                              status: "done",
                              url: `${baseUrl}${cleanPath}`,
                            };
                          });

                          // ИСПРАВЛЕНО: Глубокая очистка query-параметра пути для удаления фото портфолио
                          const handleRemovePortfolio = async (file: any) => {
                            let relativePath = file.url
                              ? file.url.replace(baseUrl, "")
                              : "";
                            if (relativePath.startsWith("/")) {
                              relativePath = relativePath.substring(1);
                            }
                            try {
                              await axios.delete(
                                `${baseUrl}/api/Employees/delete-portfolio/${record.id}?photoUrl=${encodeURIComponent(relativePath)}`,
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );
                              message.success("Работа удалена из портфолио");
                              fetchEmployees();
                              return true;
                            } catch {
                              message.error("Не удалось удалить фото");
                              return false;
                            }
                          };

                          return (
                            <div
                              style={{
                                margin: "5px 0",
                                padding: "20px",
                                background: "#fafafa",
                                borderRadius: 8,
                                borderLeft: "4px solid #faad14",
                              }}
                            >
                              <Row gutter={24}>
                                <Col span={14}>
                                  <div style={{ marginBottom: 10 }}>
                                    <Tag
                                      color="orange"
                                      style={{
                                        fontSize: "13px",
                                        padding: "4px 8px",
                                      }}
                                    >
                                      <ScissorOutlined /> Прайс-лист мастера
                                    </Tag>
                                  </div>
                                  <Table
                                    size="small"
                                    dataSource={record.services || []}
                                    pagination={false}
                                    rowKey="id"
                                    bordered
                                    columns={[
                                      {
                                        title: "Название услуги",
                                        dataIndex: "name",
                                        key: "name",
                                        render: (text) => (
                                          <strong>{text}</strong>
                                        ),
                                      },
                                      {
                                        title: "Стоимость визита",
                                        dataIndex: "price",
                                        key: "price",
                                        render: (p) => (
                                          <span
                                            style={{
                                              color: "#d4380d",
                                              fontWeight: "bold",
                                            }}
                                          >
                                            {p} ₽
                                          </span>
                                        ),
                                      },
                                      {
                                        title: "Продолжительность",
                                        dataIndex: "duration",
                                        key: "duration",
                                        render: (d) => (
                                          <Tag color="blue">{d}</Tag>
                                        ),
                                      },
                                      {
                                        title: "Действие",
                                        key: "serviceAction",
                                        render: (_: any, svc: any) => (
                                          <Space>
                                            <Button
                                              size="small"
                                              icon={<EditOutlined />}
                                              onClick={() => {
                                                setSelectedService(svc);
                                                editServiceForm.setFieldsValue({
                                                  name: svc.name,
                                                  price: svc.price,
                                                  duration: dayjs(
                                                    svc.duration,
                                                    "HH:mm",
                                                  ),
                                                });
                                                setIsEditServiceModalOpen(true);
                                              }}
                                            >
                                              Изменить
                                            </Button>
                                            <Popconfirm
                                              title="Удалить услугу из прайса?"
                                              onConfirm={() =>
                                                handleDeleteService(svc.id)
                                              }
                                              okText="Да"
                                              cancelText="Нет"
                                              okButtonProps={{ danger: true }}
                                            >
                                              <Button
                                                type="primary"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                              />
                                            </Popconfirm>
                                          </Space>
                                        ),
                                      },
                                    ]}
                                  />
                                </Col>
                                <Col
                                  span={10}
                                  style={{
                                    borderLeft: "1px solid #e8e8e8",
                                    paddingLeft: 20,
                                  }}
                                >
                                  <div style={{ marginBottom: 15 }}>
                                    <Tag
                                      color="purple"
                                      style={{
                                        fontSize: "13px",
                                        padding: "4px 8px",
                                      }}
                                    >
                                      <PictureOutlined /> Портфолио / Примеры
                                      работ
                                    </Tag>
                                  </div>
                                  <Upload
                                    action={`${baseUrl}/api/Employees/upload-portfolio/${record.id}`}
                                    headers={{
                                      Authorization: `Bearer ${token}`,
                                    }}
                                    listType="picture-card"
                                    fileList={portfolioList}
                                    onRemove={handleRemovePortfolio}
                                    onChange={(info) => {
                                      if (info.file.status === "done") {
                                        message.success(
                                          "Фото успешно добавлено в портфолио мастера!",
                                        );
                                        fetchEmployees();
                                      }
                                    }}
                                  >
                                    {portfolioList.length >= 12 ? null : (
                                      <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>
                                          Загрузить
                                        </div>
                                      </div>
                                    )}
                                  </Upload>
                                </Col>
                              </Row>
                            </div>
                          );
                        },
                        rowExpandable: () => true,
                      }}
                    />
                  </Card>
                </>
              ),
            },
            {
              key: "3",
              label: (
                <span>
                  <StopOutlined />
                  Клиентская база
                </span>
              ),
              children: (
                <Card
                  title="Все клиенты системы"
                  extra={
                    <Input
                      placeholder="Поиск клиента по имени, фамилии или Email..."
                      prefix={<SearchOutlined />}
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                      style={{ width: 320 }}
                    />
                  }
                >
                  <Table
                    dataSource={filteredClientsList}
                    columns={clientColumns}
                    rowKey="id"
                  />
                </Card>
              ),
            },
          ]}
        />

        <Modal
          title={`Новая услуга для: ${selectedEmployee?.name}`}
          open={isServiceModalOpen}
          onOk={() => serviceForm.submit()}
          onCancel={() => setIsServiceModalOpen(false)}
        >
          <Form
            form={serviceForm}
            layout="vertical"
            onFinish={handleAddService}
          >
            <Form.Item
              name="name"
              label="Название"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="price"
              label="Цена (₽)"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="duration"
              label="Длительность"
              rules={[{ required: true }]}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`Создать аккаунт для: ${selectedEmployee?.name}`}
          open={isAccessModalOpen}
          onOk={() => accessForm.submit()}
          onCancel={() => setIsAccessModalOpen(false)}
        >
          <Form
            form={accessForm}
            layout="vertical"
            onFinish={handleCreateAccess}
          >
            <Form.Item
              name="email"
              label="Email мастера"
              rules={[{ required: true, type: "email" }]}
            >
              <Input placeholder="master@example.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, min: 5 }]}
            >
              <Input.Password placeholder="Минимум 5 символов" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Редактировать данные сотрудника"
          open={isEditModalOpen}
          onOk={() => editForm.submit()}
          onCancel={() => setIsEditModalOpen(false)}
        >
          <Form form={editForm} layout="vertical" onFinish={handleEditEmployee}>
            <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="surname" label="Фамилия">
              <Input />
            </Form.Item>
            <Form.Item name="jobTitle" label="Должность">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7 (999) 123-45-67" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Редактировать параметры услуги"
          open={isEditServiceModalOpen}
          onOk={() => editServiceForm.submit()}
          onCancel={() => setIsEditServiceModalOpen(false)}
        >
          <Form
            form={editServiceForm}
            layout="vertical"
            onFinish={handleEditService}
          >
            <Form.Item
              name="name"
              label="Название процедуры"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="price"
              label="Стоимость визита (₽)"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="duration"
              label="Продолжительность сеанса"
              rules={[{ required: true }]}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
