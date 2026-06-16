using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Beauty.Models
{
    [Table("Reviews")] // Точная привязка к твоей таблице pgAdmin PascalCase!
    public class Review
    {
        [Key]
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("recordingId")]
        public int RecordingId { get; set; }

        [JsonPropertyName("clientId")]
        public int ClientId { get; set; }

        [JsonPropertyName("businessId")]
        public int BusinessId { get; set; }

        [JsonPropertyName("rating")]
        public int Rating { get; set; }

        [StringLength(500)]
        [JsonPropertyName("comment")]
        public string Comment { get; set; }

        [JsonPropertyName("clientName")]
        public string ClientName { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
