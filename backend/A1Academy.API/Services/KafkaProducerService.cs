using Confluent.Kafka;

namespace A1Academy.API.Services
{
    public class KafkaProducerService : IKafkaProducerService
    {
        private readonly IConfiguration _configuration;

        public KafkaProducerService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<bool> ProduceEventAsync(string topic, string message)
        {
            var config = new ProducerConfig
            {
                BootstrapServers = _configuration["Kafka:BootstrapServers"] ?? "localhost:9092"
            };

            using var producer = new ProducerBuilder<Null, string>(config).Build();

            var result = await producer.ProduceAsync(
                topic,
                new Message<Null, string> { Value = message });

            return result.Status == PersistenceStatus.Persisted;
        }
    }
}
