/**
 * Test script for Pointstreak service
 */
import * as pointstreakService from './services/pointstreakService.js';

async function testPointstreak() {
  console.log('=== Testing Pointstreak Service ===\n');

  try {
    // Test 1: Get York Revolution team stats
    console.log('Test 1: Fetching York Revolution batting stats...');
    const yorkStats = await pointstreakService.getTeamBattingStats('YRK');
    console.log('Team:', yorkStats.team);
    console.log('Totals:', yorkStats.totals);
    console.log(`Found ${yorkStats.players.length} players`);
    if (yorkStats.players.length > 0) {
      console.log('Sample player:', yorkStats.players[0]);
    }
    console.log('');

    // Test 2: Generate news headline
    console.log('Test 2: Generating news headline for York Revolution...');
    const headline = await pointstreakService.generateTeamNewsHeadline('YRK');
    console.log('Headline:', headline);
    console.log('');

    // Test 3: Get top performers
    console.log('Test 3: Getting top 5 batting average leaders...');
    const topBatters = await pointstreakService.getTopPerformers('avg', 5);
    console.log('Top batters:');
    topBatters.forEach((player, i) => {
      console.log(`${i + 1}. ${player.name} (${player.team}): .${Math.round(player.avg * 1000)}`);
    });
    console.log('');

    // Test 4: Test team abbreviation mapping
    console.log('Test 4: Testing team abbreviation mapping...');
    const tests = [
      'York Revolution',
      'Long Island Ducks',
      'Southern Maryland Blue Crabs',
      'Unknown Team'
    ];
    tests.forEach(teamName => {
      const abbr = pointstreakService.getTeamAbbreviation(teamName);
      console.log(`${teamName} -> ${abbr}`);
    });

    console.log('\n=== All tests passed! ===');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPointstreak();
