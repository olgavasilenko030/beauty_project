using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Beauty.Models
{
    [Table("Advertisements")] // Жесткая привязка к PascalCase-таблице в pgAdmin
    public class Advertisement
    {
        [Key]
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [Required]
        [JsonPropertyName("businessId")]
        public int BusinessId { get; set; }

        [Required]
        [StringLength(200)]
        [JsonPropertyName("title")]
        public string Title { get; set; }

        [Required]
        [StringLength(500)]
        [JsonPropertyName("imageUrl")]
        public string ImageUrl { get; set; }

        [StringLength(500)]
        [JsonPropertyName("targetUrl")]
        public string TargetUrl { get; set; }

        [Required]
        [StringLength(50)]
        [JsonPropertyName("format")] // 'LeftSidebar' или 'RightSidebar'
        public string Format { get; set; }

        [Required]
        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [Required]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
