using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using Confluent.Kafka;

namespace A1Academy.Shared.Services
{
    public class KafkaConsumerService : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;
        private readonly ILogger<KafkaConsumerService> _logger;

        public KafkaConsumerService(IConfiguration configuration, IHostEnvironment environment, ILogger<KafkaConsumerService> logger)
        {
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            return Task.Run(() => StartConsuming(stoppingToken), stoppingToken);
        }

        private void StartConsuming(CancellationToken stoppingToken)
        {
            // One consumer group per service (e.g. "A1Academy.AdminService"), so every service
            // receives every event. A shared group id would split messages between the services
            // instead, while replicas of the same service still share the load as intended.
            var groupId = _configuration["Kafka:GroupId"] ?? _environment.ApplicationName;
            var topics = (_configuration["Kafka:Topics"] ?? "test-topic")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var config = KafkaClientConfig.Apply(new ConsumerConfig
            {
                GroupId = groupId,
                AutoOffsetReset = AutoOffsetReset.Earliest,
                AllowAutoCreateTopics = true
            }, _configuration);

            using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
            consumer.Subscribe(topics);

            _logger.LogInformation("==================================================");
            _logger.LogInformation(" SUCCESS: Kafka Consumer connected & listening!");
            _logger.LogInformation(" Group: {GroupId} | Topics: {Topics}", groupId, string.Join(", ", topics));
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



