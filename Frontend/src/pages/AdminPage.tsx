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
  DatePicker,
  Select,
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
  CalendarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
export default function AdminPage() {
  const [business, setBusiness] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [interiorFileList, setInteriorFileList] = useState<any[]>([]);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchRecord, setSearchRecord] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  const [salonServices, setSalonServices] = useState<any[]>([]);
  const [selectedJournalDate, setSelectedJournalDate] = useState<any>(dayjs());
  const [employeeForm] = Form.useForm();
  const [serviceForm] = Form.useForm();
  const [accessForm] = Form.useForm();
  const [salonForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editServiceForm] = Form.useForm();
  const [recordForm] = Form.useForm();
  const [clientForm] = Form.useForm();
  // ==========================================
  // ДОБАВЛЕНО: Стейты и формы для рекламного модуля салона
  // ==========================================
  const [salonAds, setSalonAds] = useState<any[]>([]); // Баннеры этого салона из pgAdmin
  const [loadingAdUpload, setLoadingAdUpload] = useState(false); // Лоадер загрузки картинки
  const [uploadedAdImageUrl, setUploadedAdImageUrl] = useState(""); // Путь к картинке баннера
  const [adForm] = Form.useForm(); // Форма создания новой рекламы

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
      .catch(() => message.error("Ошибка загрузки мастеров"));
  };
  const fetchClients = async () => {
    if (!bId || bId === "0") return;
    try {
      const cRes = await axios.get(`${baseUrl}/api/Clients?businessId=${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(cRes.data);
    } catch {
      message.error("Ошибка базы клиентов");
    }
  };
  const fetchAllRecordings = async () => {
    if (!bId || bId === "0") return;
    try {
      const rRes = await axios.get(
        `${baseUrl}/api/Recordings?businessId=${bId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRecordings(rRes.data);
    } catch {
      message.error("Ошибка загрузки журнала визитов");
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
        instagram: bRes.data.socialLinks?.[0] || "",
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
      fetchSalonAdvertisements();

      await fetchClients();
      await fetchAllRecordings();
    } catch {
      message.error("Ошибка инициализации панели");
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
      // ИСПРАВЛЕНО: Добавили точные индексы [0] и [1] для чтения массива времени
      const hoursString =
        values.workingHoursRange &&
        values.workingHoursRange[0] &&
        values.workingHoursRange[1]
          ? `${values.workingHoursRange[0].format("HH:mm")} - ${values.workingHoursRange[1].format("HH:mm")}`
          : "09:00 - 21:00";
      const payload = {
        ...business,
        Name: values.name,
        Address: values.address || "Адрес не указан",
        Phone: values.phone,
        Description: values.description,
        WorkingHours: hoursString,
        WorkingDays: values.workingDays || [],
        SocialLinks: [values.vk || "", values.instagram || ""],
      };
      await axios.put(`${baseUrl}/api/Businesses/${bId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Данные салона обновлены!");
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
      message.success("Логотип сохранен!");
    } else if (info.file.status === "error") {
      setLoadingLogo(false);
      message.error("Ошибка сохранения вывески");
    }
  };
  const handleInteriorChange = (info: any) => {
    setInteriorFileList([...info.fileList]);
    if (info.file.status === "done") {
      message.success("Фото загружено!");
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
      message.success("Фото удалено");
      return true;
    } catch {
      message.error("Не удалось удалить фото");
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
    } catch {
      message.error("Ошибка изменения блокировки");
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
      // Поддерживаем любой регистр букв из базы, чтобы мастер не отвязался от услуги
      EmploeeId: selectedService.emploeeId || selectedService.EmploeeId,
      BusinessId: selectedService.businessId || selectedService.BusinessId,
    };
    try {
      await axios.put(
        `${baseUrl}/api/Services/${selectedService.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success("Услуга обновлена!");
      setIsEditServiceModalOpen(false);

      // ИСПРАВЛЕНО: Даем базе 300мс записать изменения, затем обновляем справочники в фоне
      setTimeout(() => {
        fetchEmployees();
      }, 300);
    } catch {
      message.error("Не удалось изменить услугу");
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/Services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Услуга удалена!");
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
      message.error("Ошибка создания доступа");
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success("Данные изменены!");
      setIsEditModalOpen(false);

      // ИСПРАВЛЕНО: Даем PostgreSQL 300мс зафиксировать трансляцию, затем обновляем список в фоне
      setTimeout(() => {
        fetchEmployees();
      }, 300);
    } catch {
      message.error("Не удалось сохранить изменения");
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/Employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Сотрудник удален");
      fetchEmployees();
    } catch {
      message.error("Ошибка удаления");
    }
  };
  const handleAdminRecordMasterChange = (masterId: number) => {
    // Принудительно сбрасываем выбранную услугу в форме, чтобы не записать старую процедуру от другого мастера
    recordForm.setFieldsValue({ serviceId: undefined });

    axios
      .get(`${baseUrl}/api/Services?employeeId=${masterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setSalonServices(res.data))
      .catch(() => message.error("Ошибка загрузки прайса услуг мастера"));
  };

  const handleSaveRecord = async (values: any) => {
    const targetDate = values.date.format("YYYY-MM-DD");
    const targetTime = values.time.format("HH:mm:00");
    const localDateTimeString = `${targetDate}T${targetTime}`;

    let endHour = 21,
      endMinute = 0;
    if (business?.workingHours && business.workingHours.includes(" - ")) {
      const closingPart = business.workingHours.split(" - ");
      const timeParts = closingPart[1].split(":");
      endHour = parseInt(timeParts[0]);
      endMinute = parseInt(timeParts[1]);
    }
    const salonEndTime = dayjs(targetDate)
      .hour(endHour)
      .minute(endMinute)
      .second(0);

    // ИСПРАВЛЕНО: Ищем длительность услуги напрямую в salonServices (гарантированный массив с бэкенда)
    const serviceInfo = salonServices.find(
      (s: any) => s.id === values.serviceId,
    );

    if (serviceInfo && serviceInfo.duration) {
      try {
        const [durationHours, durationMinutes] = serviceInfo.duration
          .split(":")
          .map(Number);
        const appointmentStartTime = dayjs(`${targetDate}T${targetTime}`);
        const appointmentEndTime = appointmentStartTime
          .add(durationHours, "hour")
          .add(durationMinutes, "minute");

        if (appointmentEndTime.isAfter(salonEndTime)) {
          message.error(
            `Запись невозможна! Процедура длится ${durationHours} ч. и закончится в ${appointmentEndTime.format("HH:mm")}, а салон работает до ${salonEndTime.format("HH:mm")}.`,
          );
          return;
        }
      } catch (e) {
        console.error("Ошибка парсинга длительности услуги:", e);
      }
    }

    const payload: any = {
      AppointmentTime: localDateTimeString,
      EmploeeId: values.employeeId, // <-- ПРОВЕРЬ: должно быть точно так (oe в середине, values.ye)
      ServiceId: values.serviceId,
      ClientId: values.clientId,
      Status: selectedRecord ? selectedRecord.status : "Scheduled",
    };

    try {
      if (selectedRecord) {
        payload.Id = selectedRecord.id;
        await axios.put(
          `${baseUrl}/api/Recordings/${selectedRecord.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        message.success("Запись успешно обновлена!");
      } else {
        await axios.post(`${baseUrl}/api/Recordings`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Запись успешно создана в журнале!");
      }
      setIsRecordModalOpen(false);
      setSelectedRecord(null);
      setSalonServices([]);
      recordForm.resetFields();
      fetchAllRecordings(); // Обновляем сетку визитов
    } catch (err: any) {
      message.error(err.response?.data || "Ошибка при сохранении записи");
    }
  };

  const handleDeleteRecording = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/Recordings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Запись удалена");
      fetchAllRecordings();
    } catch {
      message.error("Не удалось удалить запись");
    }
  };
  const handleSaveClient = async (values: any) => {
    const payload = {
      id: 0,
      name: values.name,
      surname: values.surname,
      phone: values.phone,
    };
    try {
      await axios.post(`${baseUrl}/api/Clients`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Клиент добавлен!");
      setIsClientModalOpen(false);
      clientForm.resetFields();
      fetchClients();
    } catch {
      message.error("Ошибка создания клиента");
    }
  };
  // ==========================================
  // ДОБАВЛЕНО: Обработчики запросов рекламного кабинета салона
  // ==========================================

  // 1. Автоматическая подгрузка рекламы салона при входе в ЛК
  const fetchSalonAdvertisements = () => {
    if (!bId || bId === "0") return;
    axios
      .get(`${baseUrl}/api/Advertisements/salon/${bId}`)
      .then((res) => setSalonAds(res.data || []))
      .catch(() =>
        message.error("Не удалось обновить журнал рекламных кампаний"),
      );
  };

  // Вызовем эту функцию внутри твоего существующего fetchAllData()!
  // Просто найди fetchEmployees(); внутри fetchAllData и пропиши под ним: fetchSalonAdvertisements();

  // 2. Фоновое сохранение загруженной картинки рекламы
  const handleAdImageChange = (info: any) => {
    if (info.file.status === "uploading") {
      setLoadingAdUpload(true);
      return;
    }
    if (
      info.file.status === "done" ||
      (info.file.response && info.file.response.url)
    ) {
      const serverPath = info.file.response.url;
      setUploadedAdImageUrl(serverPath); // Запоминаем путь для базы данных
      setLoadingAdUpload(false);
      message.success("Изображение баннера загружено на сервер!");
    } else if (info.file.status === "error") {
      setLoadingAdUpload(false);
      message.error("Ошибка при загрузке рекламного изображения");
    }
  };

  // 3. Отправка формы запуска новой бесплатной рекламы
  const handleCreateAd = async (values: any) => {
    if (!uploadedAdImageUrl) {
      message.warning(
        "Пожалуйста, сначала загрузите файл изображения для баннера!",
      );
      return;
    }
    try {
      const payload = {
        businessId: parseInt(bId || "0"),
        title: values.title,
        imageUrl: uploadedAdImageUrl,
        targetUrl: values.targetUrl || "",
        format: values.format, // 'LeftSidebar' или 'RightSidebar'
        isActive: true,
      };

      await axios.post(`${baseUrl}/api/Advertisements`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      message.success("Тестовый рекламный баннер успешно запущен!");
      adForm.resetFields();
      setUploadedAdImageUrl("");
      fetchSalonAdvertisements(); // Перечитываем таблицу
    } catch {
      message.error("Ошибка при создании рекламного объявления");
    }
  };

  // 4. Мгновенное включение/выключение баннера кнопкой из таблицы
  const handleToggleAd = async (id: number) => {
    try {
      await axios.patch(
        `${baseUrl}/api/Advertisements/toggle/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      message.success("Статус показа баннера на платформе обновлен!");
      fetchSalonAdvertisements();
    } catch {
      message.error("Не удалось переключить активность баннера");
    }
  };

  // 5. Полное удаление баннера из базы CRM
  const handleDeleteAd = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/Advertisements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Рекламное объявление удалено.");
      fetchSalonAdvertisements();
    } catch {
      message.error("Ошибка удаления кампании");
    }
  };
  // ==========================================

  const employeeColumns = [
    {
      title: "Фото",
      dataIndex: "avatarUrl",
      key: "avatar",
      width: 80,
      render: (url: string, record: any) => (
        <Upload
          name="file"
          showUploadList={false}
          action={`${baseUrl}/api/Employees/upload-avatar/${record.id}`}
          headers={{ Authorization: `Bearer ${token}` }}
          onChange={(info) => {
            if (info.file.status === "done") {
              message.success("Аватар мастера успешно обновлен!");

              // Перехватываем путь, возвращенный бэкендом
              const serverUrl = info.file.response?.url;

              if (serverUrl) {
                // Мгновенно обновляем стейт React, фиксируя аватарку на экране
                setEmployees((prev) => [
                  ...prev.map((emp) =>
                    emp.id === record.id
                      ? { ...emp, avatarUrl: serverUrl }
                      : emp,
                  ),
                ]);
              }
              // ИСПРАВЛЕНО: Убран вызов fetchEmployees(), чтобы база не затирала картинку старым кэшем!
            } else if (info.file.status === "error") {
              message.error("Не удалось сохранить аватар");
            }
          }}
        >
          {url ? (
            <img
              src={`${baseUrl}${url.startsWith("/") ? url : `/${url}`}?t=${new Date().getTime()}`}
              alt="avatar"
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                objectFit: "cover",
                cursor: "pointer",
              }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "#f0f2f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "1px dashed #d9d9d9",
              }}
            >
              <UserAddOutlined style={{ fontSize: 14, color: "#faad14" }} />
            </div>
          )}
        </Upload>
      ),
    },
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
            title="Уволить?"
            onConfirm={() => handleDeleteEmployee(record.id)}
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
    { title: "Email", dataIndex: "email", key: "email" },
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
    const s =
      `${e.name || ""} ${e.surname || ""} ${e.jobTitle || ""}`.toLowerCase();
    return s.includes(searchEmployee.toLowerCase());
  });
  const filteredClientsList = clients.filter((c) => {
    const s =
      `${c.name || ""} ${c.surname || ""} ${c.email || ""}`.toLowerCase();
    return s.includes(searchClient.toLowerCase());
  });
  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <Spin size="large" description="Загрузка..." />
      </div>
    );
  // ИСПРАВЛЕНО: Динамический расчет сетки времени строго по графику салона из базы данных
  const timeSlots: string[] = [];
  let startHour = 9,
    endHour = 21;

  if (business?.workingHours && business.workingHours.includes(" - ")) {
    const parts = business.workingHours.split(" - ");
    startHour = parseInt(parts[0].split(":")[0]);
    endHour = parseInt(parts[1].split(":")[0]);
  }

  for (let h = startHour; h < endHour; h++) {
    timeSlots.push(
      `${h.toString().padStart(2, "0")}:00`,
      `${h.toString().padStart(2, "0")}:30`,
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#001529",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
                      title="Основная информация"
                      style={{ borderRadius: 12 }}
                    >
                      <Form
                        form={salonForm}
                        layout="vertical"
                        onFinish={handleSaveSalonInfo}
                      >
                        <Form.Item
                          name="name"
                          label="Название"
                          rules={[{ required: true }]}
                        >
                          <Input size="large" />
                        </Form.Item>
                        <Form.Item name="address" label="Адрес">
                          <Input size="large" />
                        </Form.Item>
                        <Form.Item name="phone" label="Телефон">
                          <Input size="large" prefix={<PhoneOutlined />} />
                        </Form.Item>
                        <Form.Item name="description" label="Описание">
                          <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="workingDays" label="Рабочие дни">
                          <Checkbox.Group options={daysOfWeek} />
                        </Form.Item>
                        <Form.Item name="workingHoursRange" label="Часы работы">
                          <TimePicker.RangePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="vk" label="ВКонтакте">
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="instagram" label="Instagram">
                              <Input />
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
                          Сохранить
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={10}>
                    <Card title="Медиа">
                      <div style={{ textAlign: "center", marginBottom: 25 }}>
                        <Text strong>Логотип</Text>
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
                        <Text strong>Интерьер</Text>
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
            // ==========================================
            // ДОБАВЛЕНО: Новый рекламный кабинет салона (Вкладка №2)
            // ==========================================
            {
              key: "advertisements_tab",
              label: (
                <span>
                  <GlobalOutlined />
                  Реклама
                </span>
              ),
              children: (
                <Row gutter={[24, 24]} style={{ marginTop: 15 }}>
                  {/* Левая колонка: Форма запуска нового бесплатного баннера */}
                  <Col xs={24} lg={10}>
                    <Card
                      title="🚀 Запустить промо-кампанию"
                      style={{ borderRadius: 12 }}
                    >
                      <Form
                        form={adForm}
                        layout="vertical"
                        onFinish={handleCreateAd}
                      >
                        <Form.Item
                          name="title"
                          label="Заголовок (текст акции)"
                          rules={[
                            {
                              required: true,
                              message: "Введите текст спецпредложения",
                            },
                          ]}
                        >
                          <Input
                            placeholder="Например: Маникюр + Скидка 20% на дизайн!"
                            size="large"
                          />
                        </Form.Item>

                        <Form.Item
                          name="format"
                          label="Место размещения на платформе"
                          rules={[
                            { required: true, message: "Выберите тип баннера" },
                          ]}
                        >
                          <Select
                            placeholder="Выберите зону показа рекламы"
                            size="large"
                          >
                            <Option value="LeftSidebar">
                              Левый боковой сайдбар страниц
                            </Option>
                            <Option value="RightSidebar">
                              Правый боковой сайдбар страниц
                            </Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="targetUrl"
                          label="Ссылка при клике (необязательно)"
                        >
                          <Input
                            placeholder="Например: /salons?category=nails"
                            size="large"
                          />
                        </Form.Item>

                        <Form.Item label="Изображение баннера" required>
                          <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            action={`${baseUrl}/api/Advertisements/upload-image/${bId}`}
                            headers={{ Authorization: `Bearer ${token}` }}
                            onChange={handleAdImageChange}
                          >
                            {uploadedAdImageUrl ? (
                              <img
                                src={`${baseUrl}${uploadedAdImageUrl}`}
                                alt="ad-banner"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                            ) : (
                              <div>
                                {loadingAdUpload ? (
                                  <LoadingOutlined />
                                ) : (
                                  <PlusOutlined />
                                )}
                                <div style={{ marginTop: 8 }}>
                                  Загрузить фото
                                </div>
                              </div>
                            )}
                          </Upload>
                        </Form.Item>

                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          size="large"
                          icon={<PlusCircleOutlined />}
                          style={{
                            background: "#059669",
                            border: "none",
                            height: 45,
                            fontWeight: 700,
                          }}
                        >
                          Запустить бесплатно!
                        </Button>
                      </Form>
                    </Card>
                  </Col>

                  {/* Правая колонка: Таблица текущих объявлений */}
                  <Col xs={24} lg={14}>
                    <Card
                      title="📊 Мои рекламные объявления"
                      style={{ borderRadius: 12 }}
                    >
                      <Table
                        dataSource={salonAds}
                        rowKey="id"
                        pagination={{ pageSize: 4 }}
                        size="small"
                        columns={[
                          {
                            title: "Баннер",
                            dataIndex: "imageUrl",
                            key: "img",
                            width: 70,
                            render: (url) => (
                              <img
                                src={`${baseUrl}${url}`}
                                alt="ad"
                                style={{
                                  width: 45,
                                  height: 45,
                                  borderRadius: 8,
                                  objectFit: "cover",
                                }}
                              />
                            ),
                          },
                          {
                            title: "Текст акции",
                            dataIndex: "title",
                            key: "title",
                            render: (t) => <strong>{t}</strong>,
                          },
                          {
                            title: "Формат",
                            dataIndex: "format",
                            key: "format",
                            render: (f) =>
                              f === "LeftSidebar" ? (
                                <Tag color="blue">Левый сайдбар</Tag>
                              ) : (
                                <Tag color="purple">Правый сайдбар</Tag>
                              ),
                          },
                          {
                            title: "Статус",
                            dataIndex: "isActive",
                            key: "status",
                            render: (active, adRecord) => (
                              <Button
                                size="small"
                                type={active ? "primary" : "default"}
                                danger={!active}
                                onClick={() => handleToggleAd(adRecord.id)}
                              >
                                {active ? "Активен" : "Выключен"}
                              </Button>
                            ),
                          },
                          {
                            title: "Удалить",
                            key: "delete",
                            width: 60,
                            render: (_, adRecord) => (
                              <Popconfirm
                                title="Удалить это объявление?"
                                onConfirm={() => handleDeleteAd(adRecord.id)}
                              >
                                <Button
                                  type="primary"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            ),
                          },
                        ]}
                      />
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
                  <Card title="Новый сотрудник" style={{ marginBottom: 20 }}>
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
                            message.success("Добавлен");
                            fetchEmployees();
                            employeeForm.resetFields();
                          });
                      }}
                    >
                      <Form.Item name="name" rules={[{ required: true }]}>
                        <Input placeholder="Имя" />
                      </Form.Item>
                      <Form.Item name="surname">
                        <Input placeholder="Фамилия" />
                      </Form.Item>
                      <Form.Item name="jobTitle" rules={[{ required: true }]}>
                        <Input placeholder="Должность" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit">
                        В штат
                      </Button>
                    </Form>
                  </Card>
                  <Card
                    title="Команда"
                    extra={
                      <Input
                        placeholder="Поиск..."
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
                      expandedRowKeys={expandedKeys}
                      onExpandedRowsChange={(keys) =>
                        setExpandedKeys([...keys])
                      }
                      expandable={{
                        expandedRowRender: (record: any) => {
                          // ИСПРАВЛЕНО: Находим актуальные данные мастера прямо из живого стейта employees!
                          const currentEmpData =
                            employees.find((e) => e.id === record.id) || record;
                          const currentPhotosArray =
                            currentEmpData.portfolioPhotos ||
                            currentEmpData.PortfolioPhotos ||
                            [];

                          const portfolioList = currentPhotosArray.map(
                            (url: string, idx: number) => ({
                              uid: idx.toString(),
                              name: `w-${idx}.jpg`,
                              status: "done",
                              url: `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`,
                            }),
                          );

                          const handleRemovePortfolio = async (file: any) => {
                            let rel = file.url
                              ? file.url.replace(baseUrl, "")
                              : "";
                            if (rel.startsWith("/")) rel = rel.substring(1);
                            try {
                              await axios.delete(
                                `${baseUrl}/api/Employees/delete-portfolio/${record.id}?photoUrl=${encodeURIComponent(rel)}`,
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );
                              message.success("Удалено");
                              fetchEmployees();
                              return true;
                            } catch {
                              return false;
                            }
                          };
                          return (
                            <div
                              style={{
                                padding: 20,
                                background: "#fafafa",
                                borderRadius: 8,
                                borderLeft: "4px solid #faad14",
                              }}
                            >
                              <Row gutter={24}>
                                <Col span={14}>
                                  <Table
                                    size="small"
                                    dataSource={record.services || []}
                                    pagination={false}
                                    rowKey="id"
                                    bordered
                                    columns={[
                                      {
                                        title: "Услуга",
                                        dataIndex: "name",
                                        render: (t) => <strong>{t}</strong>,
                                      },
                                      {
                                        title: "Цена",
                                        dataIndex: "price",
                                        render: (p) => <span>{p} ₽</span>,
                                      },
                                      {
                                        title: "Время",
                                        dataIndex: "duration",
                                        render: (d) => (
                                          <Tag color="blue">{d}</Tag>
                                        ),
                                      },
                                      {
                                        title: "Действие",
                                        render: (_, svc: any) => (
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
                                              title="Удалить?"
                                              onConfirm={() =>
                                                handleDeleteService(svc.id)
                                              }
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
                                  <div
                                    style={{
                                      marginBottom: 15,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Tag color="purple">
                                      <PictureOutlined /> Портфолио / Примеры
                                      работ
                                    </Tag>

                                    {/* Красивая фиолетовая кнопка DIKIDI стиля через скрытый input */}
                                    <label
                                      style={{
                                        display: "inline-block",
                                        margin: 0,
                                        cursor: "pointer",
                                      }}
                                    >
                                      <div
                                        style={{
                                          background: "#722ed1",
                                          color: "#fff",
                                          padding: "5px 12px",
                                          borderRadius: "4px",
                                          fontSize: "12px",
                                          fontWeight: 500,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          boxShadow:
                                            "0 2px 4px rgba(0,0,0,0.05)",
                                        }}
                                      >
                                        <PlusOutlined
                                          style={{ fontSize: "11px" }}
                                        />{" "}
                                        Добавить фото
                                      </div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={async (e) => {
                                          if (
                                            !e.target.files ||
                                            e.target.files.length === 0
                                          )
                                            return;
                                          // ИСПРАВЛЕНО: Добавлен точный индекс [0] для корректного считывания файла
                                          const file = e.target.files[0];
                                          const formData = new FormData();
                                          formData.append("file", file);

                                          try {
                                            const res = await axios.post(
                                              `${baseUrl}/api/Employees/upload-portfolio/${record.id}`,
                                              formData,
                                              {
                                                headers: {
                                                  "Content-Type":
                                                    "multipart/form-data",
                                                  Authorization: `Bearer ${token}`,
                                                },
                                              },
                                            );

                                            const serverUrl =
                                              res.data?.url || res.data?.path;
                                            if (serverUrl) {
                                              message.success(
                                                "Фото мгновенно добавлено в портфолио!",
                                              );

                                              // Мгновенно обновляем стейт React в памяти для моментальной отрисовки
                                              setEmployees((prev) =>
                                                prev.map((emp) => {
                                                  if (emp.id === record.id) {
                                                    const current =
                                                      emp.portfolioPhotos || [];
                                                    return {
                                                      ...emp,
                                                      portfolioPhotos: [
                                                        ...current,
                                                        serverUrl,
                                                      ],
                                                    };
                                                  }
                                                  return emp;
                                                }),
                                              );
                                            }
                                          } catch {
                                            message.error(
                                              "Не удалось загрузить фото в портфолио",
                                            );
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {/* Живая адаптивная плитка картинок из стейта с кнопками быстрого удаления */}
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 10,
                                      maxHeight: 220,
                                      overflowY: "auto",
                                      padding: 4,
                                    }}
                                  >
                                    {(
                                      employees.find((e) => e.id === record.id)
                                        ?.portfolioPhotos || []
                                    ).length === 0 ? (
                                      <div
                                        style={{
                                          color: "#bfbfbf",
                                          fontSize: 12,
                                          padding: "20px 0",
                                        }}
                                      >
                                        Нет загруженных работ
                                      </div>
                                    ) : (
                                      (
                                        employees.find(
                                          (e) => e.id === record.id,
                                        )?.portfolioPhotos || []
                                      ).map((url: string, idx: number) => {
                                        const fullImgUrl = `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
                                        return (
                                          <div
                                            key={idx}
                                            style={{
                                              position: "relative",
                                              width: 70,
                                              height: 70,
                                              borderRadius: 6,
                                              overflow: "hidden",
                                              border: "1px solid #d9d9d9",
                                              boxShadow:
                                                "0 2px 4px rgba(0,0,0,0.02)",
                                            }}
                                          >
                                            <img
                                              src={fullImgUrl}
                                              alt="work"
                                              style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                              }}
                                            />
                                            <Button
                                              type="primary"
                                              danger
                                              shape="circle"
                                              icon={
                                                <DeleteOutlined
                                                  style={{ fontSize: 10 }}
                                                />
                                              }
                                              size="small"
                                              style={{
                                                position: "absolute",
                                                top: 2,
                                                right: 2,
                                                width: 18,
                                                height: 18,
                                                minWidth: 18,
                                                padding: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                              }}
                                              onClick={async () => {
                                                let rel = url.startsWith("/")
                                                  ? url.substring(1)
                                                  : url;
                                                try {
                                                  await axios.delete(
                                                    `${baseUrl}/api/Employees/delete-portfolio/${record.id}?photoUrl=${encodeURIComponent(rel)}`,
                                                    {
                                                      headers: {
                                                        Authorization: `Bearer ${token}`,
                                                      },
                                                    },
                                                  );
                                                  message.success(
                                                    "Фото удалено",
                                                  );
                                                  setEmployees((prev) =>
                                                    prev.map((emp) => {
                                                      if (
                                                        emp.id === record.id
                                                      ) {
                                                        return {
                                                          ...emp,
                                                          portfolioPhotos: (
                                                            emp.portfolioPhotos ||
                                                            []
                                                          ).filter(
                                                            (p: string) =>
                                                              p !== url,
                                                          ),
                                                        };
                                                      }
                                                      return emp;
                                                    }),
                                                  );
                                                } catch {
                                                  message.error(
                                                    "Не удалось удалить фото",
                                                  );
                                                }
                                              }}
                                            />
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
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
                  title="Все клиенты"
                  extra={
                    <Input
                      placeholder="Поиск..."
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
            {
              key: "4",
              label: (
                <span>
                  <CalendarOutlined />
                  Журнал записей
                </span>
              ),
              children: (
                <Card
                  title={
                    <Space>
                      <DatePicker
                        value={selectedJournalDate}
                        onChange={(d) => setSelectedJournalDate(d)}
                        format="DD.MM.YYYY"
                        allowClear={false}
                      />
                      <Button
                        icon={<UserAddOutlined />}
                        onClick={() => setIsClientModalOpen(true)}
                      >
                        + Новый клиент
                      </Button>
                    </Space>
                  }
                >
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "#fff",
                        tableLayout: "fixed",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              border: "1px solid #f0f0f0",
                              padding: 8,
                              background: "#fafafa",
                              width: 80,
                            }}
                          >
                            Время
                          </th>
                          {employees.map((e) => (
                            <th
                              key={e.id}
                              style={{
                                border: "1px solid #f0f0f0",
                                padding: 8,
                                background: "#fafafa",
                                textAlign: "center",
                                width: 200,
                              }}
                            >
                              {e.name}
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: "normal",
                                  color: "#8c8c8c",
                                }}
                              >
                                {e.jobTitle}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot, slotIdx) => {
                          return (
                            <tr key={slot} style={{ height: 60 }}>
                              <td
                                style={{
                                  border: "1px solid #f0f0f0",
                                  padding: 8,
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  background: "#fafafa",
                                  verticalAlign: "top",
                                }}
                              >
                                {slot}
                              </td>
                              {employees.map((emp) => {
                                const currentSlotTime = dayjs(
                                  `${selectedJournalDate.format("YYYY-MM-DD")}T${slot}:00`,
                                );
                                const activeRec = recordings.find((r) => {
                                  const matchDate =
                                    dayjs(r.appointmentTime).format(
                                      "YYYY-MM-DD",
                                    ) ===
                                    selectedJournalDate.format("YYYY-MM-DD");
                                  const matchEmp =
                                    Number(r.emploeeId || r.employeeId || 0) ===
                                    Number(emp.id);
                                  if (
                                    !matchDate ||
                                    !matchEmp ||
                                    r.status === "Cancelled"
                                  )
                                    return false;
                                  const start = dayjs(r.appointmentTime);
                                  let [h, m] = ["0", "30"];
                                  if (r.service?.duration) {
                                    [h, m] = r.service.duration.split(":");
                                  }
                                  const end = start
                                    .add(Number(h), "hour")
                                    .add(Number(m), "minute");
                                  return (
                                    currentSlotTime.isSame(start) ||
                                    (currentSlotTime.isAfter(start) &&
                                      currentSlotTime.isBefore(end))
                                  );
                                });
                                if (activeRec) {
                                  const start = dayjs(
                                    activeRec.appointmentTime,
                                  );
                                  if (currentSlotTime.isSame(start)) {
                                    let spans = 1;
                                    let hStr = "0",
                                      mStr = "30";
                                    if (activeRec.service?.duration) {
                                      const parts =
                                        activeRec.service.duration.split(":");
                                      hStr = parts[0];
                                      mStr = parts[1];
                                    }
                                    const parsedHours = parseInt(hStr, 10) || 0;
                                    const parsedMinutes =
                                      parseInt(mStr, 10) || 0;
                                    const totalMinutes =
                                      parsedHours * 60 + parsedMinutes;
                                    spans = Math.ceil(totalMinutes / 30);
                                    const isComp =
                                      activeRec.status === "Completed";
                                    const bg = isComp ? "#f6ffed" : "#e6f7ff";
                                    const borderCol = isComp
                                      ? "#b7eb8f"
                                      : "#91d5ff";
                                    return (
                                      <td
                                        key={emp.id}
                                        rowSpan={spans}
                                        style={{
                                          border: "1px solid #f0f0f0",
                                          padding: 2,
                                          background: bg,
                                          verticalAlign: "top",
                                          height: "1px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            border: `1px solid ${borderCol}`,
                                            borderRadius: 4,
                                            padding: 8,
                                            fontSize: 12,
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            boxShadow:
                                              "0 2px 4px rgba(0,0,0,0.02)",
                                            boxSizing: "border-box",
                                          }}
                                        >
                                          <div>
                                            <Text
                                              strong
                                              style={{
                                                fontSize: 13,
                                                display: "block",
                                                color: "#001529",
                                              }}
                                            >
                                              {activeRec.client?.name ||
                                                "Гость"}
                                            </Text>
                                            <div
                                              style={{
                                                fontSize: 11,
                                                color: "#595959",
                                                marginTop: 4,
                                                fontWeight: 500,
                                              }}
                                            >
                                              {activeRec.service?.name ||
                                                "Процедура"}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: 10,
                                                color: "#8c8c8c",
                                                marginTop: 2,
                                              }}
                                            >
                                              Длительность: {parsedHours}ч{" "}
                                              {parsedMinutes}м
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              marginTop: 12,
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              borderTop: `1px dashed ${borderCol}`,
                                              paddingTop: 6,
                                            }}
                                          >
                                            <Text
                                              type="danger"
                                              strong
                                              style={{ fontSize: 13 }}
                                            >
                                              {activeRec.service?.price} ₽
                                            </Text>
                                            <Space size={2}>
                                              <Button
                                                size="small"
                                                type="text"
                                                icon={
                                                  <EditOutlined
                                                    style={{ fontSize: 12 }}
                                                  />
                                                }
                                                onClick={() => {
                                                  setSelectedRecord(activeRec);
                                                  handleAdminRecordMasterChange(
                                                    activeRec.emploeeId ||
                                                      activeRec.employeeId,
                                                  );
                                                  recordForm.setFieldsValue({
                                                    employeeId:
                                                      activeRec.emploeeId ||
                                                      activeRec.employeeId,
                                                    clientId:
                                                      activeRec.clientId,
                                                    serviceId:
                                                      activeRec.serviceId,
                                                    date: dayjs(
                                                      activeRec.appointmentTime,
                                                    ),
                                                    time: dayjs(
                                                      activeRec.appointmentTime,
                                                    ),
                                                  });
                                                  setIsRecordModalOpen(true);
                                                }}
                                              />
                                              <Popconfirm
                                                title="Удалить визит?"
                                                onConfirm={() =>
                                                  handleDeleteRecording(
                                                    activeRec.id,
                                                  )
                                                }
                                              >
                                                <Button
                                                  size="small"
                                                  type="text"
                                                  danger
                                                  icon={
                                                    <DeleteOutlined
                                                      style={{ fontSize: 12 }}
                                                    />
                                                  }
                                                />
                                              </Popconfirm>
                                            </Space>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return null;
                                }
                                return (
                                  <td
                                    key={emp.id}
                                    style={{
                                      border: "1px solid #f0f0f0",
                                      padding: 4,
                                      textAlign: "center",
                                      cursor: "pointer",
                                      background: "#fff",
                                    }}
                                    onClick={() => {
                                      recordForm.setFieldsValue({
                                        employeeId: emp.id,
                                        date: selectedJournalDate,
                                        time: dayjs(slot, "HH:mm"),
                                      });
                                      handleAdminRecordMasterChange(emp.id);
                                      setIsRecordModalOpen(true);
                                    }}
                                  >
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={
                                        <PlusOutlined
                                          style={{ color: "#bfbfbf" }}
                                        />
                                      }
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
              label="Email"
              rules={[{ required: true, type: "email" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, min: 5 }]}
            >
              <Input.Password />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="Редактировать сотрудника"
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
            <Form.Item name="phone" label="Telephone">
              <Input />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="Редактировать услугу"
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
              label="Название"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="duration"
              label="Время"
              rules={[{ required: true }]}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={selectedRecord ? "Редактирование записи" : "Новая запись"}
          open={isRecordModalOpen}
          onOk={() => recordForm.submit()}
          onCancel={() => {
            setIsRecordModalOpen(false);
            setSelectedRecord(null);
            setSalonServices([]);
          }}
        >
          <Form form={recordForm} layout="vertical" onFinish={handleSaveRecord}>
            <Form.Item
              name="employeeId"
              label="Мастер"
              rules={[{ required: true, message: "Выберите мастера" }]}
            >
              <Select
                showSearch
                optionFilterProp="children"
                onChange={handleAdminRecordMasterChange}
              >
                {employees.map((e: any) => (
                  <Option key={e.id} value={e.id}>
                    {e.name} {e.surname || ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="clientId"
              label="Клиент"
              rules={[{ required: true, message: "Выберите клиента" }]}
            >
              <Select showSearch optionFilterProp="children">
                {clients.map((c: any) => (
                  <Option key={c.id} value={c.id}>
                    {c.name} {c.surname || ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="serviceId"
              label="Услуга"
              rules={[{ required: true, message: "Выберите услугу" }]}
            >
              <Select disabled={salonServices.length === 0}>
                {salonServices.map((s: any) => (
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
                  label="Дата"
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="time"
                  label="Время"
                  rules={[{ required: true }]}
                >
                  <TimePicker style={{ width: "100%" }} format="HH:mm" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title="Новый клиент"
          open={isClientModalOpen}
          onOk={() => clientForm.submit()}
          onCancel={() => setIsClientModalOpen(false)}
        >
          <Form form={clientForm} layout="vertical" onFinish={handleSaveClient}>
            <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="surname" label="Фамилия">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Телефон">
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
