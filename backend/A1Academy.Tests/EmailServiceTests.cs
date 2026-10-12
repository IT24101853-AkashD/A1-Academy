using System.Net;
using System.Net.Sockets;
using System.Text;
using A1Academy.Shared.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Unit tests for EmailService's connection settings, against a minimal in-process SMTP server
/// (no real mail leaves the machine). They pin down the EmailSettings:UseStartTls switch: off
/// lets a local capture server such as the test stack's Mailpit be used, and the default still
/// refuses to send anything over a connection that cannot be encrypted.
/// </summary>
public class EmailServiceTests
{
    // Speaks just enough SMTP for one message: greeting, EHLO, optional AUTH PLAIN, MAIL FROM,
    // RCPT TO, DATA, QUIT. Never offers STARTTLS. Records every command line it receives.
    private sealed class FakeSmtpServer : IAsyncDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly CancellationTokenSource _stop = new(TimeSpan.FromSeconds(20));
        private readonly Task _session;

        public List<string> Commands { get; } = new();
        public StringBuilder MessageData { get; } = new();
        public int Port { get; }

        public FakeSmtpServer(bool offerAuth)
        {
            _listener.Start();
            Port = ((IPEndPoint)_listener.LocalEndpoint).Port;
            _session = ServeOneClientAsync(offerAuth);
        }

        private async Task ServeOneClientAsync(bool offerAuth)
        {
            using var client = await _listener.AcceptTcpClientAsync(_stop.Token);
            using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII);
            await using var writer = new StreamWriter(stream, Encoding.ASCII) { NewLine = "\r\n", AutoFlush = true };

            await writer.WriteLineAsync("220 localhost ESMTP fake");
            while (await reader.ReadLineAsync(_stop.Token) is { } line)
            {
                Commands.Add(line);
                var verb = line.Split(' ')[0].ToUpperInvariant();
                switch (verb)
                {
                    case "EHLO":
                        if (offerAuth)
                        {
                            await writer.WriteLineAsync("250-localhost");
                            await writer.WriteLineAsync("250 AUTH PLAIN");
                        }
                        else
                        {
                            await writer.WriteLineAsync("250 localhost");
                        }
                        break;
                    case "AUTH":
                        await writer.WriteLineAsync("235 Authentication successful");
                        break;
                    case "DATA":
                        await writer.WriteLineAsync("354 End data with <CR><LF>.<CR><LF>");
                        while (await reader.ReadLineAsync(_stop.Token) is { } dataLine && dataLine != ".")
                        {
                            MessageData.AppendLine(dataLine);
                        }
                        await writer.WriteLineAsync("250 Queued");
                        break;
                    case "QUIT":
                        await writer.WriteLineAsync("221 Bye");
                        return;
                    default:
                        await writer.WriteLineAsync("250 OK");
                        break;
                }
            }
        }

        public async ValueTask DisposeAsync()
        {
            _stop.Cancel();
            _listener.Stop();
            try
            {
                await _session;
            }
            catch (Exception)
            {
                // The session ends by cancellation or a closed socket when a test is done with it.
            }
            _stop.Dispose();
        }
    }

    private static EmailService CreateService(int port, string? useStartTls, string password)
    {
        var settings = new Dictionary<string, string?>
        {
            ["EmailSettings:SmtpServer"] = "127.0.0.1",
            ["EmailSettings:SmtpPort"] = port.ToString(),
            ["EmailSettings:SenderName"] = "A1 Academy",
            ["EmailSettings:SenderEmail"] = "sender@example.com",
            ["EmailSettings:SmtpPassword"] = password,
            ["EmailSettings:UseStartTls"] = useStartTls,
        };
        return new EmailService(new ConfigurationBuilder().AddInMemoryCollection(settings).Build());
    }

    [Fact]
    public async Task SendEmail_WithStartTlsOffAndNoPassword_DeliversWithoutLoggingIn()
    {
        await using var server = new FakeSmtpServer(offerAuth: false);
        var service = CreateService(server.Port, useStartTls: "false", password: "");

        await service.SendEmailAsync("student@example.com", "Verification Code", "<p>Your code is 12345</p>");

        Assert.Contains(server.Commands, c => c.StartsWith("MAIL FROM:<sender@example.com>", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(server.Commands, c => c.StartsWith("RCPT TO:<student@example.com>", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(server.Commands, c => c.StartsWith("AUTH", StringComparison.OrdinalIgnoreCase));
        Assert.Contains("Subject: Verification Code", server.MessageData.ToString());
        Assert.Contains("Your code is 12345", server.MessageData.ToString());
    }

    [Fact]
    public async Task SendEmail_WithStartTlsOffAndAPassword_StillLogsInBeforeSending()
    {
        await using var server = new FakeSmtpServer(offerAuth: true);
        var service = CreateService(server.Port, useStartTls: "false", password: "relay-password");

        await service.SendEmailAsync("teacher@example.com", "Account approved", "<p>Welcome</p>");

        var auth = server.Commands.FindIndex(c => c.StartsWith("AUTH PLAIN", StringComparison.OrdinalIgnoreCase));
        var mailFrom = server.Commands.FindIndex(c => c.StartsWith("MAIL FROM", StringComparison.OrdinalIgnoreCase));
        Assert.True(auth >= 0, "Expected an AUTH command.");
        Assert.True(auth < mailFrom, "Expected the login to come before the message.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("true")]
    [InlineData("not-a-boolean")]
    public async Task SendEmail_ByDefault_RefusesAServerThatCannotEncryptAndSendsNothing(string? useStartTls)
    {
        // Anything other than an explicit "false" keeps StartTLS required, so a typo in the
        // setting can never downgrade production mail to plain text.
        await using var server = new FakeSmtpServer(offerAuth: true);
        var service = CreateService(server.Port, useStartTls, password: "relay-password");

        await Assert.ThrowsAnyAsync<Exception>(() =>
            service.SendEmailAsync("student@example.com", "Verification Code", "<p>12345</p>"));

        Assert.DoesNotContain(server.Commands, c => c.StartsWith("AUTH", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(server.Commands, c => c.StartsWith("MAIL FROM", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(0, server.MessageData.Length);
    }
}
