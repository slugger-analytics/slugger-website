import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Pointstreak API Service
 * Fetches live player statistics from Atlantic League Baseball's Pointstreak backend
 */

const POINTSTREAK_BASE_URL = 'https://baseball.pointstreak.com/ajax/stats_ajax.php';
const LEAGUE_ID = 174; // Atlantic League
const SEASON_ID = 34102; // 2025 season

/**
 * Fetch batting statistics for all players
 * @param {Object} options - Query options
 * @param {string} options.orderby - Sort field (e.g., 'avg', 'hr', 'rbi')
 * @param {string} options.direction - Sort direction ('ASC' or 'DESC')
 * @param {string} options.teamname - Filter by team abbreviation (optional)
 * @returns {Promise<Array>} Array of player batting stats
 */
async function getBattingStats(options = {}) {
  const {
    orderby = 'teamname',
    direction = 'ASC',
    teamname = '',
    range = '',
    bset = 0
  } = options;

  const url = `${POINTSTREAK_BASE_URL}?action=getplayer&seasonid=${SEASON_ID}&leagueid=${LEAGUE_ID}&orderby=${orderby}&sort=${direction}&teamname=${teamname}&bset=${bset}&range=${range}&direction=${direction}&opponline=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/html',
        'Referer': 'https://baseball.pointstreak.com/'
      },
      timeout: 10000
    });

    // Check if response is JSON with html property
    if (response.data && typeof response.data === 'object' && 'html' in response.data) {
      if (!response.data.html) {
        console.warn('[Pointstreak] API returned null html - season data may not be available yet');
        // Return empty array - caller can handle fallback
        return [];
      }
      return parseBattingStatsHTML(response.data.html);
    }

    // Otherwise treat as direct HTML
    return parseBattingStatsHTML(response.data);
  } catch (error) {
    console.error('[Pointstreak] Error fetching batting stats:', error.message);
    // Return empty array instead of throwing - allows graceful fallback
    return [];
  }
}

/**
 * Parse HTML table into structured player stats
 * @param {string} html - HTML response from Pointstreak API
 * @returns {Array} Parsed player statistics
 */
function parseBattingStatsHTML(html) {
  const $ = cheerio.load(html);
  const players = [];

  $('tbody tr').each((index, row) => {
    const $row = $(row);
    const cells = $row.find('td');

    if (cells.length === 0) return; // Skip header rows

    const playerName = $(cells[0]).text().trim();
    const teamAbbr = $(cells[1]).text().trim();
    const position = $(cells[2]).text().trim();

    // Skip if no player name
    if (!playerName) return;

    const player = {
      name: playerName,
      team: teamAbbr,
      position: position,
      avg: parseFloat($(cells[3]).text().trim()) || 0,
      games: parseInt($(cells[4]).text().trim()) || 0,
      ab: parseInt($(cells[5]).text().trim()) || 0,
      runs: parseInt($(cells[6]).text().trim()) || 0,
      hits: parseInt($(cells[7]).text().trim()) || 0,
      doubles: parseInt($(cells[8]).text().trim()) || 0,
      triples: parseInt($(cells[9]).text().trim()) || 0,
      hr: parseInt($(cells[10]).text().trim()) || 0,
      rbi: parseInt($(cells[11]).text().trim()) || 0,
      bb: parseInt($(cells[12]).text().trim()) || 0,
      hbp: parseInt($(cells[13]).text().trim()) || 0,
      so: parseInt($(cells[14]).text().trim()) || 0,
      sf: parseInt($(cells[15]).text().trim()) || 0,
      sh: parseInt($(cells[16]).text().trim()) || 0,
      sb: parseInt($(cells[17]).text().trim()) || 0,
      cs: parseInt($(cells[18]).text().trim()) || 0,
      dp: parseInt($(cells[19]).text().trim()) || 0,
      errors: parseInt($(cells[20]).text().trim()) || 0
    };

    players.push(player);
  });

  return players;
}

/**
 * Get top performers by category
 * @param {string} category - Stat category ('avg', 'hr', 'rbi', 'sb', etc.)
 * @param {number} limit - Number of players to return
 * @returns {Promise<Array>} Top performers
 */
async function getTopPerformers(category = 'avg', limit = 10) {
  const stats = await getBattingStats({ orderby: category, direction: 'DESC' });
  return stats.slice(0, limit);
}

/**
 * Get team batting stats (aggregated)
 * @param {string} teamAbbr - Team abbreviation (e.g., 'YRK', 'LI', 'SMD')
 * @returns {Promise<Object>} Team stats and player list
 */
async function getTeamBattingStats(teamAbbr) {
  const stats = await getBattingStats({ teamname: teamAbbr });
  
  // Calculate team totals
  const teamTotals = stats.reduce((acc, player) => {
    acc.hits += player.hits;
    acc.hr += player.hr;
    acc.rbi += player.rbi;
    acc.runs += player.runs;
    acc.sb += player.sb;
    return acc;
  }, { hits: 0, hr: 0, rbi: 0, runs: 0, sb: 0 });

  // Calculate team batting average
  const totalAB = stats.reduce((sum, p) => sum + p.ab, 0);
  const totalHits = stats.reduce((sum, p) => sum + p.hits, 0);
  teamTotals.avg = totalAB > 0 ? (totalHits / totalAB).toFixed(3) : '.000';

  return {
    team: teamAbbr,
    totals: teamTotals,
    players: stats
  };
}

/**
 * Generate news headline for team based on recent performance
 * @param {string} teamAbbr - Team abbreviation
 * @returns {Promise<string|null>} News-style headline or null if data unavailable
 */
async function generateTeamNewsHeadline(teamAbbr) {
  try {
    const teamStats = await getTeamBattingStats(teamAbbr);
    const players = teamStats.players;

    if (players.length === 0) {
      console.log(`[Pointstreak] No player data available for ${teamAbbr} - API may be offline or season not started`);
      return null;
    }

    // Find top batter (min 50 AB)
    const topBatter = players
      .filter(p => p.ab >= 50)
      .sort((a, b) => b.avg - a.avg)[0];

    // Find home run leader
    const hrLeader = players
      .filter(p => p.games >= 20)
      .sort((a, b) => b.hr - a.hr)[0];

    // Find stolen base leader
    const sbLeader = players
      .filter(p => p.games >= 20)
      .sort((a, b) => b.sb - a.sb)[0];

    // Generate headline based on available stats
    const headlines = [];

    if (topBatter && topBatter.avg >= 0.300) {
      headlines.push(`${topBatter.name} leads ${teamAbbr} with .${Math.floor(topBatter.avg * 1000)} average`);
    }

    if (hrLeader && hrLeader.hr >= 10) {
      headlines.push(`${hrLeader.name} powers offense with ${hrLeader.hr} homers`);
    }

    if (sbLeader && sbLeader.sb >= 20) {
      headlines.push(`${sbLeader.name} sparks speed game with ${sbLeader.sb} steals`);
    }

    // Return first headline or generic message
    return headlines.length > 0 
      ? headlines[0]
      : `${teamAbbr} offense showing strong performance`;

  } catch (error) {
    console.error(`[Pointstreak] Error generating headline for ${teamAbbr}:`, error.message);
    return null;
  }
}

/**
 * Map team name to Pointstreak abbreviation
 */
const TEAM_ABBREVIATION_MAP = {
  'York Revolution': 'YRK',
  'Staten Island FerryHawks': 'SI',
  'Southern Maryland Blue Crabs': 'SMD',
  'Long Island Ducks': 'LI',
  'Lexington Legends': 'LEX',
  'Lancaster Barnstormers': 'LAN',
  'High Point Rockers': 'HP',
  'Hagerstown Flying Boxcars': 'HAG',
  'Gastonia Baseball Club': 'GAS',
  'Charleston Dirty Birds': 'CWV'
};

/**
 * Get Pointstreak team abbreviation from full team name
 * @param {string} teamName - Full team name
 * @returns {string} Team abbreviation or original name if not found
 */
function getTeamAbbreviation(teamName) {
  return TEAM_ABBREVIATION_MAP[teamName] || teamName;
}

export {
  getBattingStats,
  getTopPerformers,
  getTeamBattingStats,
  generateTeamNewsHeadline,
  getTeamAbbreviation,
  TEAM_ABBREVIATION_MAP
};
