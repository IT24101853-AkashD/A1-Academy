using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace A1Academy.Shared.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(emailSettings["SenderName"], emailSettings["SenderEmail"]));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = body };
            email.Body = builder.ToMessageBody();

            // StartTLS and a login are what a real relay (Gmail) needs and stay the default.
            // EmailSettings:UseStartTls=false with no SmtpPassword is for a local capture server
            // such as the test stack's Mailpit (docker-compose.test.yml), which offers neither.
            var useStartTls = !bool.TryParse(emailSettings["UseStartTls"], out var configured) || configured;
            var password = emailSettings["SmtpPassword"];

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(emailSettings["SmtpServer"]!, int.Parse(emailSettings["SmtpPort"]!),
                useStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None);
            if (useStartTls || !string.IsNullOrEmpty(password))
            {
                await smtp.AuthenticateAsync(emailSettings["SenderEmail"]!, password ?? string.Empty);
            }
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}




