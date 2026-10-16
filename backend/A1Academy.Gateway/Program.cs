using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // The gateway is the only CORS boundary: the services are reached through it, never from
        // the browser directly, so they send no CORS headers of their own (two
        // Access-Control-Allow-Origin values on one response would make the browser reject it).
        policy.WithOrigins("http://localhost:5173", "https://a1-academy-frontend-d4d6h7fuhebqbyfm.malaysiawest-01.azurewebsites.net")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddHealthChecks();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.UseCors("AllowFrontend");

// Public API documentation at /swagger: one UI with a dropdown per service. Each document is
// fetched through the "*DocsRoute" routes in appsettings.json, and "Try it out" requests go
// through the normal /api routes, so they behave exactly like calls from the frontend.
app.UseSwaggerUI(options =>
{
    options.DocumentTitle = "A1 Academy API";
    options.SwaggerEndpoint("/openapi/auth.json", "Auth service");
    options.SwaggerEndpoint("/openapi/admin.json", "Admin service");
    options.SwaggerEndpoint("/openapi/teacher.json", "Teacher service");
    options.SwaggerEndpoint("/openapi/student.json", "Student service");
});

app.MapReverseProxy();
// The gateway has no database of its own, so ready == live: the process is up and routing.
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");
await app.RunAsync();
