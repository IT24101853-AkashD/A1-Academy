namespace A1Academy.API.Services
{
    public interface IKafkaProducerService
    {
        Task<bool> ProduceEventAsync(string topic, string message);
    }
}
