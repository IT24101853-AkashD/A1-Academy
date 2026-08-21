using Microsoft.EntityFrameworkCore;
using A1Academy.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Connection String
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Register DbContext directly with full namespace path to prevent using issues
builder.Services.AddDbContext<A1Academy.API.Data.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register Kafka Services
builder.Services.AddSingleton<KafkaProducerService>();
builder.Services.AddHostedService<KafkaConsumerService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Startup verification
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<A1Academy.API.Data.AppDbContext>();
        if (dbContext.Database.CanConnect())
        {
            Console.WriteLine("==================================================");
            Console.WriteLine(" SUCCESS: Backend connected to PostgreSQL (v15)!");
            Console.WriteLine("==================================================");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($" ERROR DB Connection: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();