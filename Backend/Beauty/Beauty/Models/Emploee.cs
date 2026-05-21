using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("emploee")]
public partial class Emploee
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Surname { get; set; }

    public string? Description { get; set; }

    public string EmployeeServices { get; set; } = null!;

    public string? JobTitle { get; set; }

    public string? Phone { get; set; }

    public string? EMail { get; set; }

    public string? Noytification { get; set; }

    public string? Schedule { get; set; }

    public string? Access { get; set; }

    public DateOnly? HireDate { get; set; }

    public int? BusinessId { get; set; }

    [Column("portfolio_photos")]
    public List<string>? PortfolioPhotos { get; set; } = new();


    public virtual Business? Business { get; set; }

    public virtual ICollection<Recording> Recordings { get; set; } = new List<Recording>();

    public virtual ICollection<Service> Services { get; set; } = new List<Service>();
}
