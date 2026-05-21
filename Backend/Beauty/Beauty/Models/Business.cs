using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("business")]
public partial class Business
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Address { get; set; }

    [Column("owner_id")]
    public int? OwnerId { get; set; }

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    // НОВЫЕ ПОЛЯ:
    [Column("phone")]
    public string? Phone { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("working_hours")]
    public string? WorkingHours { get; set; }

    [Column("working_days")]
    public List<string>? WorkingDays { get; set; } = new();

    [Column("social_links")]
    public List<string>? SocialLinks { get; set; } = new();

    [Column("interior_photos")]
    public List<string>? InteriorPhotos { get; set; } = new();

    public virtual ICollection<Emploee> Emploees { get; set; } = new List<Emploee>();
    public virtual ICollection<Service> Services { get; set; } = new List<Service>();
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
