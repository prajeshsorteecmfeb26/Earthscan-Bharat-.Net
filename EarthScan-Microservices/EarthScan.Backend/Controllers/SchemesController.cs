using System.Collections.Generic;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SchemesController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public SchemesController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/schemes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GovernmentScheme>>> GetSchemes()
        {
            return await _context.GovernmentSchemes.ToListAsync();
        }
    }
}
