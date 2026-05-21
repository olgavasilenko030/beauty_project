using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Beauty.Models;

[Table("recording")]
public partial class Recording
{
    public int Id { get; set; }

    public DateTime AppointmentTime { get; set; }

    public string? Status { get; set; }

    public int? ClientId { get; set; }

    public int? EmploeeId { get; set; }

    public int? ServiceId { get; set; }

    public virtual Client? Client { get; set; }

    public virtual Emploee? Emploee { get; set; }

    public virtual Service? Service { get; set; }
}
