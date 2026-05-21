using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("client")]
public partial class Client
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Surname { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public decimal? Discount { get; set; }

    public string? SourceOfAttraction { get; set; }

    public string? Notes { get; set; }

    [Column("is_blocked")]
    public bool IsBlocked { get; set; } = false;

    public virtual ICollection<Recording> Recordings { get; set; } = new List<Recording>();
}
