using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace A1Academy.Shared.Services
{
    // Interactive API documentation. Each service publishes its OpenAPI document at
    // /swagger/v1/swagger.json (and its own UI at /swagger for local debugging). The gateway serves
    // the public Swagger UI, which loads all four documents through gateway routes, so "Try it out"
    // calls take the same path through the gateway as the frontend's.
    //
    // Enabled in every environment, production included: the documents only describe routes and
    // payloads, and every protected endpoint still requires a valid JWT.
    public static class SwaggerExtensions
    {
        public const string DocumentPath = "/swagger/v1/swagger.json";

        public static IServiceCollection AddA1AcademySwagger(this IServiceCollection services, string serviceName)
        {
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = $"A1 Academy {serviceName} API",
                    Version = "v1",
                    Description = "Sign in with POST /api/auth/login, then click Authorize and paste the returned token."
                });

                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "The token returned by POST /api/auth/login."
                });
                options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
                });

                // Request/response classes are often nested in their controller under common names
                // (Teacher and Student both have AssignmentsController.AssignmentSummary), which
                // Swashbuckle's default short-name ids reject as conflicts. Namespace-qualified ids
                // stay unique across every service.
                options.CustomSchemaIds(SchemaId);
                options.DocumentFilter<LowercasePathsFilter>();
            });
            return services;
        }

        public static WebApplication UseA1AcademySwagger(this WebApplication app)
        {
            app.UseSwagger();
            app.UseSwaggerUI(options => options.SwaggerEndpoint(DocumentPath, "v1"));
            return app;
        }

        // Controllers routed as "api/[controller]" would be listed as /api/Auth/login. Routing is
        // case-insensitive either way; this shows the lowercase paths the frontend and gateway use,
        // leaving route parameters such as {classId} untouched.
        private sealed class LowercasePathsFilter : IDocumentFilter
        {
            public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
            {
                var paths = new OpenApiPaths();
                foreach (var (path, item) in swaggerDoc.Paths)
                {
                    var segments = path.Split('/').Select(s => s.StartsWith('{') ? s : s.ToLowerInvariant());
                    paths[string.Join('/', segments)] = item;
                }
                swaggerDoc.Paths = paths;
            }
        }

        private static string SchemaId(Type type)
        {
            var name = type.IsGenericType
                ? $"{type.Name.Split('`')[0]}Of{string.Join("And", type.GetGenericArguments().Select(SchemaId))}"
                : type.Name;
            if (type.DeclaringType != null)
            {
                return $"{SchemaId(type.DeclaringType)}.{name}";
            }

            var ns = type.Namespace ?? string.Empty;
            if (ns.StartsWith("A1Academy."))
            {
                ns = ns.Substring("A1Academy.".Length);
            }
            return ns.Length == 0 ? name : $"{ns}.{name}";
        }
    }
}
