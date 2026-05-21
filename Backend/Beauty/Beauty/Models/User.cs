using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("users")] // Связываем с таблицей users
public partial class User
{
    public int Id { get; set; }

    public string Email { get; set; } = null!;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    [Column("business_id")]
    public int? BusinessId { get; set; }

    [Column("linked_id")]
    public int? LinkedId { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    public virtual Business? Business { get; set; }
}