using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Confluent.Kafka;

namespace A1Academy.Shared.Services
{
    // Registered as a singleton: a Kafka producer is thread-safe and expensive to create
    // (it opens broker connections), so one instance is reused for the app's lifetime.
    public class KafkaProducerService : IKafkaProducerService, IDisposable
    {
        private readonly IProducer<Null, string> _producer;
        private readonly ILogger<KafkaProducerService> _logger;

        public KafkaProducerService(IConfiguration configuration, ILogger<KafkaProducerService> logger)
        {
            _logger = logger;

            var config = KafkaClientConfig.Apply(new ProducerConfig
            {
                // Fail a request in seconds rather than the 5-minute default when the broker is down
                MessageTimeoutMs = 10000
            }, configuration);

            _producer = new ProducerBuilder<Null, string>(config).Build();
        }

        public async Task<bool> ProduceEventAsync(string topic, string message)
        {
            try
            {
                var result = await _producer.ProduceAsync(
                    topic,
                    new Message<Null, string> { Value = message });

                return result.Status == PersistenceStatus.Persisted;
            }
            catch (KafkaException ex)
            {
                _logger.LogError(ex, "Failed to publish to Kafka topic {Topic}", topic);
                return false;
            }
        }

        public void Dispose()
        {
            _producer.Flush(TimeSpan.FromSeconds(5));
            _producer.Dispose();
        }
    }
}
