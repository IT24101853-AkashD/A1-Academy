using Confluent.Kafka;

namespace A1Academy.API.Services
{
    public class KafkaConsumerService : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<KafkaConsumerService> _logger;

        public KafkaConsumerService(IConfiguration configuration, ILogger<KafkaConsumerService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            return Task.Run(() => StartConsuming(stoppingToken), stoppingToken);
        }

        private void StartConsuming(CancellationToken stoppingToken)
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = _configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
                GroupId = "a1-academy-consumer-group",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                AllowAutoCreateTopics = true
            };

            using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
            consumer.Subscribe("test-topic");

            _logger.LogInformation("==================================================");
            _logger.LogInformation(" SUCCESS: Kafka Consumer connected & listening!");
            _logger.LogInformation("==================================================");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(TimeSpan.FromMilliseconds(500));
                    if (consumeResult != null)
                    {
                        _logger.LogInformation($"[KAFKA RECEIVED]: {consumeResult.Message.Value}");
                    }
                }
                catch (ConsumeException ex) when (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    // Topic does not exist yet; wait for producer or broker creation
                    Thread.Sleep(2000);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Kafka Consumer Error: {ex.Message}");
                    Thread.Sleep(1000);
                }
            }
        }
    }
}