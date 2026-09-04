using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using A1Academy.API.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Register Azure Application Insights Telemetry & Monitoring
builder.Services.AddApplicationInsightsTelemetry();

// Connection String
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Register DbContext
builder.Services.AddDbContext<A1Academy.API.Data.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register Kafka Services
builder.Services.AddSingleton<IKafkaProducerService, KafkaProducerService>();
builder.Services.AddHostedService<KafkaConsumerService>();

// Register Email & OTP Services
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://a1-academy-frontend-d4d6h7fuhebqbyfm.southeastasia-01.azurewebsites.net")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors("AllowFrontend");

// Startup DB Verification
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<A1Academy.API.Data.AppDbContext>();
        dbContext.Database.Migrate();
        if (dbContext.Database.CanConnect())
        {
            Console.WriteLine("==================================================");
            Console.WriteLine(" SUCCESS: Backend connected to PostgreSQL (v15)!");
            Console.WriteLine("==================================================");

            SeedAdminUser(dbContext, builder.Configuration);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($" ERROR DB Connection: {ex.Message}");
    }
}

// Bootstraps the platform's first Administrator account from configuration (Admin:Email /
// Admin:Password), since there is no self-registration path for the Admin role - see
// AuthController.Register, which deliberately rejects it. No-ops once any Admin exists, and
// no-ops entirely if the config values aren't set (nothing to seed with).
static void SeedAdminUser(A1Academy.API.Data.AppDbContext dbContext, IConfiguration configuration)
{
    var adminEmail = configuration["Admin:Email"];
    var adminPassword = configuration["Admin:Password"];

    if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
    {
        Console.WriteLine("INFO: Admin:Email/Admin:Password not configured - skipping admin account bootstrap.");
        return;
    }

    if (dbContext.Users.Any(u => u.Role == "Admin"))
    {
        return;
    }

    dbContext.Users.Add(new A1Academy.API.Data.Models.User
    {
        FirstName = "Admin",
        Email = adminEmail,
        Role = "Admin",
        AuthProvider = "Regular",
        IsEmailVerified = true,
        IsApproved = true,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword)
    });
    dbContext.SaveChanges();
    Console.WriteLine($"SUCCESS: Bootstrap Admin account created for {adminEmail}.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Create uploads directory if not exists
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

// Serve static files from the uploads directory
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();