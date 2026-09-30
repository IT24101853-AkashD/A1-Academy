using Microsoft.Extensions.Configuration;
using Confluent.Kafka;

namespace A1Academy.Shared.Services
{
    // Builds the connection settings shared by the producer and consumer from the "Kafka"
    // config section, so the same image can talk to the local docker-compose broker
    // (PLAINTEXT, no auth) or a managed broker in Azure (SASL_SSL) purely via env vars:
    //   Kafka__BootstrapServers, Kafka__SecurityProtocol, Kafka__SaslMechanism,
    //   Kafka__SaslUsername, Kafka__SaslPassword
    public static class KafkaClientConfig
    {
        public static T Apply<T>(T config, IConfiguration configuration) where T : ClientConfig
        {
            var section = configuration.GetSection("Kafka");

            config.BootstrapServers = section["BootstrapServers"] ?? "localhost:9092";

            if (Enum.TryParse<SecurityProtocol>(section["SecurityProtocol"], true, out var protocol))
            {
                config.SecurityProtocol = protocol;
            }

            if (Enum.TryParse<SaslMechanism>(section["SaslMechanism"], true, out var mechanism))
            {
                config.SaslMechanism = mechanism;
            }

            if (!string.IsNullOrWhiteSpace(section["SaslUsername"]))
            {
                config.SaslUsername = section["SaslUsername"];
                config.SaslPassword = section["SaslPassword"];
            }

            return config;
        }
    }
}
