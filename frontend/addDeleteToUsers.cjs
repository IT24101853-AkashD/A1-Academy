const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'UsersController.cs');
let content = fs.readFileSync(controllerPath, 'utf8');

const deleteEndpoint = `        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<ActionResult<UserSummary>> ApplyTransitionAsync`;

content = content.replace(
    'private async Task<ActionResult<UserSummary>> ApplyTransitionAsync',
    deleteEndpoint
);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Added DeleteUser to UsersController.');
