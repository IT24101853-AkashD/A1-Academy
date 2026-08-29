using A1Academy.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace A1Academy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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