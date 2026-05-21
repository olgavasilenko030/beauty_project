using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("services")]
public partial class Service
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public decimal Price { get; set; }

    public TimeSpan Duration { get; set; }

    [Column("break_after_recording")] // Соответствие SQL-колонке
    public TimeSpan? BreakAfterRecording { get; set; }

    [Column("emploee_id")] // Соответствие SQL-колонке (с твоей опечаткой)
    public int? EmploeeId { get; set; }

    [Column("business_id")] // Соответствие SQL-колонке
    public int? BusinessId { get; set; }

    public virtual Business? Business { get; set; }
    public virtual Emploee? Emploee { get; set; }
    public virtual ICollection<Recording> Recordings { get; set; } = new List<Recording>();
}