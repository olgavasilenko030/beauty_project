using System;
using System.Collections.Generic;

namespace Beauty.Models
{
    // Главный пакет с процентами и списками для фронтенда
    public class AnalyticsDto
    {
        public double RetentionRate { get; set; }  // Возвращаемость клиентов в %
        public double SalonOccupancy { get; set; } // Загруженность салона в %
        public int TotalRecordings { get; set; }   // Всего записей за период
        public int ActiveClientsCount { get; set; } // Количество уникальных клиентов

        // Список сегментированных клиентов (Новые, Постоянные, Пропавшие)
        public List<ClientSegmentDto> Clients { get; set; } = new();
    }

    // Карточка клиента для нашей будущей таблицы сортировки
    public class ClientSegmentDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public int TotalVisits { get; set; }
        public string Segment { get; set; } = null!; // "New" (Новый), "Regular" (Постоянный), "Lost" (Пропавший)
        public string? LastVisitDate { get; set; }
    }
}
