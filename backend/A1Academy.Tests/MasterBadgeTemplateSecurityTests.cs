using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// AA-67 - security tests for /api/admin/badges. MasterBadgeTemplatesEndpointTests covers what an
/// Admin can do; this file covers everyone who must be kept out, on every one of the five
/// endpoints: no token, a non-Admin role, a forged/tampered/expired token, and an Admin whose
/// account has since been deactivated. Each rejection also checks that nothing was changed.
/// </summary>
public class MasterBadgeTemplateSecurityTests : IClassFixture<ApiWebApplicationFactory>
{
    private const string BaseUrl = "/api/admin/badges";
    private const string Password = "BadgeSecPass1!";
    private const string OriginalCriteria = "Attend every class in a month";
    private readonly ApiWebApplicationFactory _factory;

    public MasterBadgeTemplateSecurityTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // Every route the controller exposes. "{id}" is replaced with a real template's id, so a
    // rejection can never be explained away as "that template didn't exist anyway".
    public static TheoryData<string, string> Endpoints => new()
    {
        { "GET", "" },
        { "GET", "/{id}" },
        { "POST", "" },
        { "PUT", "/{id}" },
        { "DELETE", "/{id}" },
    };

    public static TheoryData<string, string, string> NonAdminEndpoints
    {
        get
        {
            var data = new TheoryData<string, string, string>();
            foreach (var role in new[] { "Student", "Teacher" })
            {
                foreach (var endpoint in Endpoints)
                {
                    data.Add(role, (string)endpoint[0], (string)endpoint[1]);
                }
            }
            return data;
        }
    }

    private async Task<User> SeedUserAsync(string role)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            FirstName = role,
            Email = $"{role.ToLowerInvariant()}.badgesec.{Guid.NewGuid():N}@example.com",
            Role = role,
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static async Task<string> LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private async Task<MasterBadgeTemplate> SeedTemplateAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var template = new MasterBadgeTemplate
        {
            Name = $"Protected {Guid.NewGuid():N}"[..24],
            IconName = "shield",
            Criteria = OriginalCriteria
        };
        context.MasterBadgeTemplates.Add(template);
        await context.SaveChangesAsync();
        return template;
    }

    // The write endpoints all send this name, so "was anything created or overwritten?" is one lookup.
    private static HttpRequestMessage BuildRequest(string method, string path, int templateId, string? token, string attackName)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), BaseUrl + path.Replace("{id}", templateId.ToString()));
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (method is "POST" or "PUT")
        {
            request.Content = JsonContent.Create(new { name = attackName, iconName = "skull", criteria = "Should never be saved" });
        }
        return request;
    }

    private async Task AssertNothingChangedAsync(MasterBadgeTemplate original, string attackName)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var current = await context.MasterBadgeTemplates.AsNoTracking().SingleOrDefaultAsync(t => t.Id == original.Id);
        Assert.NotNull(current);
        Assert.Equal(original.Name, current!.Name);
        Assert.Equal("shield", current.IconName);
        Assert.Equal(OriginalCriteria, current.Criteria);
        Assert.False(await context.MasterBadgeTemplates.AnyAsync(t => t.Name == attackName));
    }

    private static string NewAttackName() => $"Sneaky {Guid.NewGuid():N}"[..24];

    private static string CreateToken(User user, string role, string signingKey, DateTime expires)
    {
        var handler = new JwtSecurityTokenHandler();
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, role),
                new Claim(User.SecurityStampClaimType, user.SecurityStamp)
            }),
            NotBefore = expires.AddHours(-1),
            Expires = expires,
            Issuer = ApiWebApplicationFactory.TestJwtIssuer,
            Audience = ApiWebApplicationFactory.TestJwtAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)), SecurityAlgorithms.HmacSha256Signature)
        };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task BadgeEndpoint_WithoutToken_ReturnsUnauthorizedAndChangesNothing(string method, string path)
    {
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();

        var response = await _factory.CreateClient().SendAsync(BuildRequest(method, path, template.Id, null, attackName));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Theory]
    [MemberData(nameof(NonAdminEndpoints))]
    public async Task BadgeEndpoint_AsNonAdmin_ReturnsForbiddenAndChangesNothing(string role, string method, string path)
    {
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, (await SeedUserAsync(role)).Email);

        var response = await client.SendAsync(BuildRequest(method, path, template.Id, token, attackName));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task BadgeEndpoint_WithAdminTokenSignedByAnUnknownKey_ReturnsUnauthorized(string method, string path)
    {
        // A real Admin's id and security stamp, correct issuer and audience - only the signature
        // is wrong, which is all an attacker without the server's key can produce.
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();
        var admin = await SeedUserAsync("Admin");
        var forged = CreateToken(admin, "Admin", "AttackerOwnedKeyThatIsAlsoLongEnoughForHmacSha256!", DateTime.UtcNow.AddHours(1));

        var response = await _factory.CreateClient().SendAsync(BuildRequest(method, path, template.Id, forged, attackName));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Fact]
    public async Task BadgeEndpoints_WithAStudentTokenEditedToClaimAdmin_ReturnUnauthorized()
    {
        // Privilege escalation attempt: take a genuine Student token and rewrite the role in its
        // payload, keeping the original signature.
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();
        var client = _factory.CreateClient();
        var parts = (await LoginAsync(client, (await SeedUserAsync("Student")).Email)).Split('.');

        var payload = Encoding.UTF8.GetString(Base64UrlEncoder.DecodeBytes(parts[1]));
        var escalated = payload.Replace("\"Student\"", "\"Admin\"");
        Assert.NotEqual(payload, escalated);
        var tampered = $"{parts[0]}.{Base64UrlEncoder.Encode(escalated)}.{parts[2]}";

        var create = await client.SendAsync(BuildRequest("POST", "", template.Id, tampered, attackName));
        var delete = await client.SendAsync(BuildRequest("DELETE", "/{id}", template.Id, tampered, attackName));

        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, delete.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Fact]
    public async Task BadgeEndpoints_WithAnExpiredAdminToken_ReturnUnauthorized()
    {
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();
        var admin = await SeedUserAsync("Admin");
        var expired = CreateToken(admin, "Admin", ApiWebApplicationFactory.TestJwtKey, DateTime.UtcNow.AddHours(-1));
        var client = _factory.CreateClient();

        var list = await client.SendAsync(BuildRequest("GET", "", template.Id, expired, attackName));
        var update = await client.SendAsync(BuildRequest("PUT", "/{id}", template.Id, expired, attackName));

        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, update.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Fact]
    public async Task BadgeEndpoints_AfterTheAdminIsDeactivated_RejectTheirExistingToken()
    {
        var template = await SeedTemplateAsync();
        var attackName = NewAttackName();
        var admin = await SeedUserAsync("Admin");
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, admin.Email);

        // The token works right up until the account is switched off.
        var before = await client.SendAsync(BuildRequest("GET", "/{id}", template.Id, token, attackName));
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await context.Users.SingleAsync(u => u.Id == admin.Id)).AccountStatus = AccountStatus.Deactivated;
            await context.SaveChangesAsync();
        }

        var update = await client.SendAsync(BuildRequest("PUT", "/{id}", template.Id, token, attackName));
        var delete = await client.SendAsync(BuildRequest("DELETE", "/{id}", template.Id, token, attackName));

        Assert.Equal(HttpStatusCode.Unauthorized, update.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, delete.StatusCode);
        await AssertNothingChangedAsync(template, attackName);
    }

    [Fact]
    public async Task CreateAndUpdateBadge_WithFieldsOverTheLengthLimits_ReturnBadRequestAndStoreNothing()
    {
        var template = await SeedTemplateAsync();
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, (await SeedUserAsync("Admin")).Email);
        var oversizedName = new string('N', 101);

        var create = new HttpRequestMessage(HttpMethod.Post, BaseUrl)
        {
            Content = JsonContent.Create(new { name = oversizedName, criteria = "Valid criteria" })
        };
        create.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var update = new HttpRequestMessage(HttpMethod.Put, $"{BaseUrl}/{template.Id}")
        {
            Content = JsonContent.Create(new { name = "Valid name", criteria = new string('C', 1001) })
        };
        update.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createResponse = await client.SendAsync(create);
        var updateResponse = await client.SendAsync(update);

        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        await AssertNothingChangedAsync(template, oversizedName);
    }
}
