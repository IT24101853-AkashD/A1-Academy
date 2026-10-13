using System.Net;
using System.Net.Http.Json;
using System.Text;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for POST /api/auth/google-login. Google itself is replaced by a stub HTTP
/// handler, so nothing leaves the machine: each test decides what "Google" answers and checks
/// what the API does with it, and what the API sent to Google.
/// </summary>
public class GoogleLoginEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public GoogleLoginEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // Stands in for Google's userinfo endpoint and records the one request it receives.
    private sealed class StubGoogleHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public HttpRequestMessage? Received { get; private set; }

        public StubGoogleHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Received = request;
            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public StubHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    // Swapping a service builds a separate host with its own in-memory database, so each test
    // keeps the host it gets back and reads and seeds through that host, not through _factory.
    private WebApplicationFactory<A1Academy.AuthService.Program> CreateHostWithGoogle(StubGoogleHandler google) =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IHttpClientFactory>();
            services.AddSingleton<IHttpClientFactory>(new StubHttpClientFactory(google));
        }));

    private static StubGoogleHandler GoogleAccepts(string email, string givenName = "Gina", string familyName = "Google") =>
        new(HttpStatusCode.OK, $$"""{"email":"{{email}}","given_name":"{{givenName}}","family_name":"{{familyName}}"}""");

    private static async Task SeedUserAsync(WebApplicationFactory<A1Academy.AuthService.Program> host, string email, string role, string authProvider)
    {
        using var scope = host.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Users.Add(new User
        {
            FirstName = "Existing",
            Email = email,
            Role = role,
            AuthProvider = authProvider,
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = authProvider == "Local" ? BCrypt.Net.BCrypt.HashPassword("ExistingPass1!") : ""
        });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task GoogleLogin_WhenGoogleRejectsTheToken_ReturnsUnauthorizedAndCreatesNoAccount()
    {
        var google = new StubGoogleHandler(HttpStatusCode.Unauthorized, """{"error":"invalid_token"}""");
        var client = CreateHostWithGoogle(google).CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google-login", new { credential = "forged-or-expired-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        // The caller's token was passed to Google's userinfo endpoint as a Bearer token.
        Assert.Equal("https://www.googleapis.com/oauth2/v3/userinfo", google.Received!.RequestUri!.ToString());
        Assert.Equal("Bearer", google.Received.Headers.Authorization!.Scheme);
        Assert.Equal("forged-or-expired-token", google.Received.Headers.Authorization.Parameter);
    }

    [Fact]
    public async Task GoogleLogin_ForANewGoogleUser_CreatesAnActiveStudentAndReturnsAToken()
    {
        var email = $"google.new.{Guid.NewGuid():N}@example.com";
        var host = CreateHostWithGoogle(GoogleAccepts(email));
        var client = host.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google-login", new { credential = "valid-google-token" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("token").GetString()));
        Assert.Equal("Student", body.GetProperty("role").GetString());

        using var scope = host.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var created = await context.Users.AsNoTracking().SingleAsync(u => u.Email == email);
        Assert.Equal("Gina", created.FirstName);
        Assert.Equal("Google", created.AuthProvider);
        Assert.Equal(AccountStatus.Active, created.AccountStatus);
    }

    [Fact]
    public async Task GoogleLogin_SecondTimeForTheSameGoogleUser_LogsInWithoutCreatingADuplicate()
    {
        var email = $"google.returning.{Guid.NewGuid():N}@example.com";
        var host = CreateHostWithGoogle(GoogleAccepts(email));
        var client = host.CreateClient();

        (await client.PostAsJsonAsync("/api/auth/google-login", new { credential = "first-visit" })).EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/api/auth/google-login", new { credential = "second-visit" });

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        using var scope = host.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await context.Users.CountAsync(u => u.Email == email));
    }

    [Theory]
    [InlineData("Student", "Local")]
    [InlineData("Teacher", "Local")]
    public async Task GoogleLogin_ForAnEmailRegisteredWithAPassword_IsRefused(string role, string authProvider)
    {
        // Otherwise anyone controlling a Google account with that address could bypass the password.
        var email = $"google.existing.{Guid.NewGuid():N}@example.com";
        var host = CreateHostWithGoogle(GoogleAccepts(email));
        await SeedUserAsync(host, email, role, authProvider);
        var client = host.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google-login", new { credential = "valid-google-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
