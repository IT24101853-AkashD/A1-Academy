using A1Academy.Shared.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace A1Academy.AdminService.Controllers
{
    // Admin-only: this publishes straight to the Kafka broker (Azure Event Hubs in production),
    // and the Admin Container App's own address is public even though the gateway doesn't route
    // /api/events - without this, anyone on the internet could push messages onto the broker.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class EventsController : ControllerBase
    {
        private readonly IKafkaProducerService _producer;

        public EventsController(IKafkaProducerService producer)
        {
            _producer = producer;
        }

        [HttpPost("publish")]
        public async Task<IActionResult> PublishMessage([FromBody] string message)
        {
            var success = await _producer.ProduceEventAsync("test-topic", message);

            if (success)
            {
                return Ok(new
                {
                    Status = "Event Published Successfully",
                    Message = message
                });
            }

            return StatusCode(500, "Failed to publish event");
        }
    }
}


