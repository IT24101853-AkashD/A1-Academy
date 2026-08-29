using A1Academy.API.Controllers;
using A1Academy.API.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Text.Json;
using Xunit;

namespace A1Academy.Tests
{
    public class EventsControllerTests
    {
        [Fact]
        public async Task PublishMessage_WithValidMessage_ReturnsOk()
        {
            // Arrange
            var kafkaMock = new Mock<IKafkaProducerService>();
            kafkaMock
                .Setup(k => k.ProduceEventAsync("test-topic", It.IsAny<string>()))
                .ReturnsAsync(true);

            var controller = new EventsController(kafkaMock.Object);
            string testMessage = "Test Event Message";

            // Act
            var result = await controller.PublishMessage(testMessage);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);

            var jsonString = JsonSerializer.Serialize(okResult.Value);
            using var jsonDoc = JsonDocument.Parse(jsonString);
            var root = jsonDoc.RootElement;
            
            Assert.Equal("Event Published Successfully", root.GetProperty("Status").GetString());
            Assert.Equal(testMessage, root.GetProperty("Message").GetString());

            // Verify that ProduceEventAsync was called exactly once
            kafkaMock.Verify(
                k => k.ProduceEventAsync("test-topic", testMessage),
                Times.Once
            );
        }

        [Fact]
        public async Task PublishMessage_WithFailedProduction_ReturnsInternalServerError()
        {
            // Arrange
            var kafkaMock = new Mock<IKafkaProducerService>();
            kafkaMock
                .Setup(k => k.ProduceEventAsync("test-topic", It.IsAny<string>()))
                .ReturnsAsync(false);

            var controller = new EventsController(kafkaMock.Object);
            string testMessage = "Test Event Message";

            // Act
            var result = await controller.PublishMessage(testMessage);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, statusCodeResult.StatusCode);
            Assert.Equal("Failed to publish event", statusCodeResult.Value);

            // Verify that ProduceEventAsync was called exactly once
            kafkaMock.Verify(
                k => k.ProduceEventAsync("test-topic", testMessage),
                Times.Once
            );
        }

        [Fact]
        public async Task PublishMessage_WithEmptyMessage_ReturnsOk()
        {
            // Arrange
            var kafkaMock = new Mock<IKafkaProducerService>();
            kafkaMock
                .Setup(k => k.ProduceEventAsync("test-topic", It.IsAny<string>()))
                .ReturnsAsync(true);

            var controller = new EventsController(kafkaMock.Object);
            string emptyMessage = "";

            // Act
            var result = await controller.PublishMessage(emptyMessage);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);

            var jsonString = JsonSerializer.Serialize(okResult.Value);
            using var jsonDoc = JsonDocument.Parse(jsonString);
            var root = jsonDoc.RootElement;
            
            Assert.Equal("Event Published Successfully", root.GetProperty("Status").GetString());
            Assert.Equal(emptyMessage, root.GetProperty("Message").GetString());

            kafkaMock.Verify(
                k => k.ProduceEventAsync("test-topic", emptyMessage),
                Times.Once
            );
        }

        [Fact]
        public async Task PublishMessage_WithLongMessage_ReturnsOk()
        {
            // Arrange
            var kafkaMock = new Mock<IKafkaProducerService>();
            kafkaMock
                .Setup(k => k.ProduceEventAsync("test-topic", It.IsAny<string>()))
                .ReturnsAsync(true);

            var controller = new EventsController(kafkaMock.Object);
            string longMessage = new string('A', 10000); // 10KB message

            // Act
            var result = await controller.PublishMessage(longMessage);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);

            var jsonString = JsonSerializer.Serialize(okResult.Value);
            using var jsonDoc = JsonDocument.Parse(jsonString);
            var root = jsonDoc.RootElement;
            
            Assert.Equal("Event Published Successfully", root.GetProperty("Status").GetString());
            Assert.Equal(longMessage, root.GetProperty("Message").GetString());

            kafkaMock.Verify(
                k => k.ProduceEventAsync("test-topic", longMessage),
                Times.Once
            );
        }
    }
}
