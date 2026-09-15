using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
namespace A1Academy.Shared.Services
{
    public interface IKafkaProducerService
    {
        Task<bool> ProduceEventAsync(string topic, string message);
    }
}




