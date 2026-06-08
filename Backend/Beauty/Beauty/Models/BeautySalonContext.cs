using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Models;

public partial class BeautySalonContext : DbContext
{
    public BeautySalonContext()
    {
    }

    public BeautySalonContext(DbContextOptions<BeautySalonContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Business> Businesses { get; set; }
    public virtual DbSet<Client> Clients { get; set; }
    public virtual DbSet<Emploee> Emploees { get; set; }
    public virtual DbSet<Recording> Recordings { get; set; }
    public virtual DbSet<Service> Services { get; set; }
    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<Review> Reviews { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseNpgsql("Host=localhost;Database=beauty_bd;Username=postgres;Password=pa$$w0rd");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Business>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("business_pkey");
            entity.ToTable("business");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");

            // ДОБАВЛЕНО: Маппинг логотипа салона
            entity.Property(e => e.LogoUrl).HasColumnName("logo_url");
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("client_pkey");
            entity.ToTable("client");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.Discount).HasColumnName("discount");
            entity.Property(e => e.Gender).HasColumnName("gender");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.SourceOfAttraction).HasColumnName("source_of_attraction");
            entity.Property(e => e.Surname).HasColumnName("surname");

            // ДОБАВЛЕНО: Маппинг флага блокировки клиента
            entity.Property(e => e.IsBlocked).HasColumnName("is_blocked").HasDefaultValue(false);
        });

        modelBuilder.Entity<Emploee>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("emploee_pkey");
            entity.ToTable("emploee");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Access).HasColumnName("access");
            entity.Property(e => e.BusinessId).HasColumnName("business_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EMail).HasColumnName("e_mail");
            entity.Property(e => e.EmployeeServices).HasColumnName("employee_services");
            entity.Property(e => e.HireDate).HasDefaultValueSql("CURRENT_DATE").HasColumnName("hire_date");
            entity.Property(e => e.JobTitle).HasColumnName("job_title");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Noytification).HasColumnName("noytification");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Schedule).HasColumnName("schedule");
            entity.Property(e => e.Surname).HasColumnName("surname");

            entity.HasOne(d => d.Business).WithMany(p => p.Emploees)
                .HasForeignKey(d => d.BusinessId)
                .HasConstraintName("fk_business_employee");
        });

        modelBuilder.Entity<Recording>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recording_pkey");
            entity.ToTable("recording");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.AppointmentTime).HasColumnName("appointment_time");
            entity.Property(e => e.ClientId).HasColumnName("client_id");
            entity.Property(e => e.EmploeeId).HasColumnName("emploee_id");
            entity.Property(e => e.ServiceId).HasColumnName("service_id");
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValueSql("'Scheduled'::character varying").HasColumnName("status");

            entity.HasOne(d => d.Client).WithMany(p => p.Recordings)
                .HasForeignKey(d => d.ClientId)
                .HasConstraintName("fk_recording_client");

            entity.HasOne(d => d.Emploee).WithMany(p => p.Recordings)
                .HasForeignKey(d => d.EmploeeId)
                .HasConstraintName("fk_recording_employee");

            entity.HasOne(d => d.Service).WithMany(p => p.Recordings)
                .HasForeignKey(d => d.ServiceId)
                .HasConstraintName("fk_recording_service");
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("services_pkey");
            entity.ToTable("services");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.BreakAfterRecording).HasColumnName("break_after_recording");
            entity.Property(e => e.BusinessId).HasColumnName("business_id");
            entity.Property(e => e.Duration).HasColumnName("duration");
            entity.Property(e => e.EmploeeId).HasColumnName("emploee_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Price).HasColumnName("price");

            entity.HasOne(d => d.Business).WithMany(p => p.Services)
                .HasForeignKey(d => d.BusinessId)
                .HasConstraintName("fk_business_services");

            entity.HasOne(d => d.Emploee).WithMany(p => p.Services)
                .HasForeignKey(d => d.EmploeeId)
                .HasConstraintName("fk_emploee");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");
            entity.ToTable("users");
            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.BusinessId).HasColumnName("business_id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.LinkedId).HasColumnName("linked_id");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.Role).HasColumnName("role");

            // ДОБАВЛЕНО: Маппинг аватарки юзера
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");

            entity.HasOne(d => d.Business).WithMany(p => p.Users)
                .HasForeignKey(d => d.BusinessId)
                .HasConstraintName("fk_user_business");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            // ИСПРАВЛЕНО: Теперь имя ключа в кавычках строго совпадает с CONSTRAINT "Reviews_pkey" в pgAdmin
            entity.HasKey(e => e.Id).HasName("Reviews_pkey");
            entity.ToTable("Reviews"); // Имя таблицы в pgAdmin

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("Id");
            entity.Property(e => e.RecordingId).HasColumnName("RecordingId");
            entity.Property(e => e.ClientId).HasColumnName("ClientId");
            entity.Property(e => e.BusinessId).HasColumnName("BusinessId");
            entity.Property(e => e.Rating).HasColumnName("Rating");
            entity.Property(e => e.Comment).HasColumnName("Comment");
            entity.Property(e => e.ClientName).HasColumnName("ClientName");
            entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
        });


        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    

}
