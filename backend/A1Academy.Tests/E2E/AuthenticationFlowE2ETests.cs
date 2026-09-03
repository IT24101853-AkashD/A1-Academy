using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using Xunit;

namespace A1Academy.Tests.E2E
{
    /// <summary>
    /// Drives a real Chrome browser through the full Student journey: open the registration
    /// form, verify the emailed OTP, submit the account, then log in with the new credentials
    /// and confirm an authenticated (role-correct) session is reached.
    ///
    /// This is a UI test against a *running* environment - it does not start the app itself.
    /// Prerequisites, from the repo root:
    ///   1. docker-compose up -d postgres kafka zookeeper
    ///   2. dotnet run --project backend/A1Academy.API   (defaults to http://localhost:5123, ASPNETCORE_ENVIRONMENT=Development)
    ///   3. npm run dev --prefix frontend                (defaults to http://localhost:5173)
    ///
    /// Run only this suite with:  dotnet test --filter Category=E2E
    /// (it is excluded from the default/CI `dotnet test` run - see ci.yml)
    ///
    /// Env var overrides:
    ///   E2E_FRONTEND_URL     - default http://localhost:5173
    ///   E2E_API_URL          - default http://localhost:5123
    ///   E2E_HEADLESS         - default true; set to "false" to watch the browser drive itself
    ///   E2E_BROWSER_BINARY   - path to a Chromium-based browser (Chrome, Brave, Edge, ...).
    ///                          Auto-detected from common install locations if unset. Selenium's
    ///                          bundled Selenium Manager resolves a matching chromedriver for
    ///                          whichever binary is used - Brave and Edge both speak the same
    ///                          DevTools protocol as Chrome, so ChromeDriver drives them too.
    ///
    /// OTP retrieval: real signup emails go out over live SMTP with no test bypass, so this
    /// suite reads the pending OTP from the Development/Testing-only GET /api/auth/debug-otp
    /// endpoint instead of an inbox. That endpoint 404s outside those environments.
    ///
    /// Scope note: Teacher signups start unapproved and cannot log in until an admin approves
    /// them, so only the Student path is covered here. The app also has no dashboard route yet
    /// (see App.jsx) - success is the existing post-login "success-login-modal" plus the
    /// correct role recorded in localStorage.
    /// </summary>
    [Trait("Category", "E2E")]
    public class AuthenticationFlowE2ETests : IDisposable
    {
        private readonly string _frontendUrl;
        private readonly string _apiUrl;
        private readonly IWebDriver _driver;
        private readonly HttpClient _http = new();

        public AuthenticationFlowE2ETests()
        {
            _frontendUrl = Environment.GetEnvironmentVariable("E2E_FRONTEND_URL") ?? "http://localhost:5173";
            _apiUrl = (Environment.GetEnvironmentVariable("E2E_API_URL") ?? "http://localhost:5123").TrimEnd('/');

            var headless = !string.Equals(
                Environment.GetEnvironmentVariable("E2E_HEADLESS"),
                "false",
                StringComparison.OrdinalIgnoreCase);

            var options = new ChromeOptions();
            var browserBinary = DetectBrowserBinary();
            if (!string.IsNullOrEmpty(browserBinary))
            {
                options.BinaryLocation = browserBinary;
            }
            if (headless)
            {
                options.AddArgument("--headless=new");
            }
            options.AddArgument("--window-size=1440,1000");
            options.AddArgument("--disable-gpu");
            options.AddArgument("--no-sandbox");

            // No driver path/service is configured here on purpose: Selenium's bundled
            // Selenium Manager inspects options.BinaryLocation, figures out that browser's
            // version, and downloads/caches a matching chromedriver automatically.
            _driver = new ChromeDriver(options);
        }

        private static string? DetectBrowserBinary()
        {
            var overridePath = Environment.GetEnvironmentVariable("E2E_BROWSER_BINARY");
            if (!string.IsNullOrWhiteSpace(overridePath))
            {
                return File.Exists(overridePath) ? overridePath : throw new FileNotFoundException(
                    $"E2E_BROWSER_BINARY was set but no file exists at '{overridePath}'.");
            }

            string[] candidates =
            {
                // Brave
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"),
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"),
                Environment.ExpandEnvironmentVariables(@"%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"),
                // Google Chrome, if that's what's actually installed
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
                Environment.ExpandEnvironmentVariables(@"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
                // Microsoft Edge, also Chromium-based
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
                Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
                // Common macOS/Linux locations, in case this ever runs off Windows
                "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/usr/bin/brave-browser",
                "/usr/bin/google-chrome",
            };

            return candidates.FirstOrDefault(File.Exists);
        }

        [Fact]
        public async Task Student_CanSignUp_ThenLogIn_AndReachAuthenticatedSession()
        {
            var wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(15));
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 10);
            var email = $"selenium.e2e.{uniqueId}@example.com";
            const string firstName = "Selenium";
            const string password = "E2eTest!12345";

            // --- Registration ---
            _driver.Navigate().GoToUrl(_frontendUrl);

            ClickNavButton(wait, "Register");
            WaitForModalOpen(wait, "register-modal");

            ClickWithinModal(wait, "register-modal", "h3", "Register as a Student");
            WaitForModalOpen(wait, "register-student-modal");

            _driver.FindElement(By.Id("student-firstname")).SendKeys(firstName);
            _driver.FindElement(By.Id("student-email")).SendKeys(email);
            _driver.FindElement(By.Id("student-verify-btn")).Click();

            WaitForModalOpen(wait, "otp-modal");

            // The signup email goes out over live SMTP; pull the OTP from the
            // Development-only test hook instead of reading a real inbox.
            var otp = await FetchOtpAsync(email);
            Assert.False(string.IsNullOrEmpty(otp));
            for (var i = 0; i < otp!.Length; i++)
            {
                _driver.FindElement(By.Id($"otp-{i}")).SendKeys(otp[i].ToString());
            }
            ClickWithinModal(wait, "otp-modal", "button", "Verify Code");

            // Back on the registration form with the email now marked Verified.
            WaitForModalOpen(wait, "register-student-modal");
            _driver.FindElement(By.Id("student-password")).SendKeys(password);
            _driver.FindElement(By.Id("student-confirm-password")).SendKeys(password);
            ClickWithinModal(wait, "register-student-modal", "button", "Create Active Account");

            // Student signups are auto-approved -> success modal -> straight to login.
            WaitForModalOpen(wait, "success-student-modal");
            ClickWithinModal(wait, "success-student-modal", "button", "Continue to Login");
            WaitForModalOpen(wait, "login-modal");

            // --- Login with the freshly created credentials ---
            _driver.FindElement(By.Id("login-email")).SendKeys(email);
            _driver.FindElement(By.Id("login-password")).SendKeys(password);
            ClickWithinModal(wait, "login-modal", "button", "Log In");

            // --- Success criteria: authenticated session reached with the correct role ---
            WaitForModalOpen(wait, "success-login-modal");
            wait.Until(d => !string.IsNullOrEmpty(GetLocalStorageItem(d, "token")));
            Assert.Equal("Student", GetLocalStorageItem(_driver, "role"));
        }

        private async Task<string?> FetchOtpAsync(string email)
        {
            for (var attempt = 0; attempt < 20; attempt++)
            {
                var response = await _http.GetAsync($"{_apiUrl}/api/auth/debug-otp?email={Uri.EscapeDataString(email)}");
                if (response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                    return body.GetProperty("otp").GetString();
                }
                await Task.Delay(250);
            }
            return null;
        }

        private static void WaitForModalOpen(WebDriverWait wait, string modalId)
        {
            wait.Until(d =>
            {
                var classAttr = d.FindElement(By.Id(modalId)).GetAttribute("class") ?? string.Empty;
                return classAttr.Contains("opacity-100");
            });
        }

        private static void ClickNavButton(WebDriverWait wait, string exactText)
        {
            var xpath = $"//nav//button[normalize-space(.)='{exactText}']";
            var element = wait.Until(d =>
            {
                var candidate = d.FindElements(By.XPath(xpath)).FirstOrDefault();
                return candidate is { Displayed: true, Enabled: true } ? candidate : null;
            });
            element!.Click();
        }

        private static void ClickWithinModal(WebDriverWait wait, string modalId, string tag, string exactText)
        {
            var xpath = $"//div[@id='{modalId}']//{tag}[normalize-space(.)='{exactText}']";
            var element = wait.Until(d =>
            {
                var candidate = d.FindElements(By.XPath(xpath)).FirstOrDefault();
                return candidate is { Displayed: true, Enabled: true } ? candidate : null;
            });
            element!.Click();
        }

        private static string? GetLocalStorageItem(IWebDriver driver, string key)
        {
            var js = (IJavaScriptExecutor)driver;
            return js.ExecuteScript("return window.localStorage.getItem(arguments[0]);", key) as string;
        }

        public void Dispose()
        {
            _driver.Quit();
            _driver.Dispose();
            _http.Dispose();
        }
    }
}
