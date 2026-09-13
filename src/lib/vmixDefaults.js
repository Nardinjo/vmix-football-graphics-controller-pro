// Default vMix graphic/field/shortcut configuration. Operators can change all of
// this from the vMix page without touching code. Kept in a shared module so the
// context, the Live Match screen, the vMix page, and JSON backups share one truth.

export const GRAPHIC_KEYS = [
  'Score Bug',
  'Player Lower Third',
  'Coach',
  'Goal',
  'Yellow Card',
  'Red Card',
  'Substitution',
  'Lineup',
  'Statistics',
  'Man of the Match',
  'Sponsor',
  'VAR',
];

// No auto-mapping by default — the operator decides which vMix input each graphic
// uses on the vMix page. Each graphic starts unmapped (blank) until you set it.
export const DEFAULT_GRAPHIC_INPUTS = {};

// For each graphic, maps our data keys -> the vMix text field name inside that input.
export const DEFAULT_FIELD_MAP = {
  'Score Bug': { HOME_NAME: 'HomeName', HOME_SHORT: 'HomeShort', HOME_SCORE: 'HomeScore', HOME_LOGO: 'HomeLogo', AWAY_NAME: 'AwayName', AWAY_SHORT: 'AwayShort', AWAY_SCORE: 'AwayScore', AWAY_LOGO: 'AwayLogo', CLOCK: 'Clock', HALF: 'Half', MINUTE: 'Minute' },
  'Player Lower Third': { PLAYER_NAME: 'PlayerName', PLAYER_NUMBER: 'PlayerNumber', SHORT_NAME: 'ShortName', POSITION: 'Position', TEAM_NAME: 'TeamName', TEAM_SHORT: 'TeamShort', TEAM_LOGO: 'TeamLogo', PLAYER_PHOTO: 'PlayerPhoto' },
  'Coach': { COACH_NAME: 'Name', COACH_NATIONALITY: 'Nationality', COACH_ROLE: 'Role', TEAM_NAME: 'TeamName', TEAM_LOGO: 'TeamLogo', COACH_PHOTO: 'CoachPhoto' },
  'Goal': { PLAYER_NAME: 'PlayerName', PLAYER_NUMBER: 'PlayerNumber', TEAM_NAME: 'TeamName', TEAM_SHORT: 'TeamShort', MINUTE: 'Minute', ASSIST: 'Assist', GOAL_TYPE: 'GoalType' },
  'Yellow Card': { PLAYER_NAME: 'PlayerName', PLAYER_NUMBER: 'PlayerNumber', TEAM_NAME: 'TeamName', MINUTE: 'Minute' },
  'Red Card': { PLAYER_NAME: 'PlayerName', PLAYER_NUMBER: 'PlayerNumber', TEAM_NAME: 'TeamName', MINUTE: 'Minute', REASON: 'Reason' },
  'Substitution': { PLAYER_OUT_NAME: 'OutName', PLAYER_OUT_NUMBER: 'OutNumber', PLAYER_IN_NAME: 'InName', PLAYER_IN_NUMBER: 'InNumber', TEAM_NAME: 'TeamName', MINUTE: 'Minute' },
  'Lineup': { HOME_NAME: 'HomeName', AWAY_NAME: 'AwayName', HOME_FORMATION: 'HomeFormation', AWAY_FORMATION: 'AwayFormation', HOME_COACH: 'HomeCoach', AWAY_COACH: 'AwayCoach' },
  'Statistics': { HOME_POSSESSION: 'HomePoss', AWAY_POSSESSION: 'AwayPoss', HOME_SHOTS: 'HomeShots', AWAY_SHOTS: 'AwayShots', HOME_SHOTS_ON_TARGET: 'HomeSOT', AWAY_SHOTS_ON_TARGET: 'AwaySOT', HOME_CORNERS: 'HomeCorners', AWAY_CORNERS: 'AwayCorners', HOME_FOULS: 'HomeFouls', AWAY_FOULS: 'AwayFouls' },
  'Man of the Match': { PLAYER_NAME: 'PlayerName', PLAYER_NUMBER: 'PlayerNumber', TEAM_NAME: 'TeamName', TEAM_LOGO: 'TeamLogo', PLAYER_PHOTO: 'PlayerPhoto' },
  'Sponsor': { SPONSOR_NAME: 'Name', SPONSOR_LOGO: 'Logo' },
  'VAR': { VAR_STATUS: 'Status', REASON: 'Reason', MINUTE: 'Minute', TEAM_NAME: 'TeamName' },
};

export const DEFAULT_SHORTCUTS = {
  F1: 'goal',
  F2: 'yellow',
  F3: 'red',
  F4: 'sub',
  F5: 'lowerthird',
  F6: 'coach',
  F7: 'lineup',
  F8: 'stats',
  F9: 'var',
  F10: 'clear',
};

// Keyword rules used to auto-match vMix titles already in the project to our
// graphics on connect. Only fills BLANK mappings — an operator's manual choice
// is never overwritten. Matching is case-insensitive against the input title.
export const AUTO_MATCH_RULES = {
  'Score Bug': [/score\s*bug/i, /\bscorebug\b/i, /\bscore\b/i],
  'Player Lower Third': [/lower\s*third/i, /player\s*lower/i, /\blower3\b/i],
  'Coach': [/\bcoach\b/i],
  'Goal': [/\bgoal\b/i],
  'Yellow Card': [/yellow\s*card/i, /\byellow\b/i],
  'Red Card': [/red\s*card/i],
  'Substitution': [/substitution/i, /\bsub\b/i],
  'Lineup': [/line\s*up/i, /starting\s*xi/i, /\blineup\b/i],
  'Statistics': [/stat(istics)?\b/i, /\bstats?\b/i],
  'Man of the Match': [/man\s*of\s*the\s*match/i, /\bmotm\b/i],
  'Sponsor': [/sponsor/i],
  'VAR': [/\bvar\b/i],
};

export const SHORTCUT_ACTIONS = [
  { id: 'goal', label: 'Goal' },
  { id: 'yellow', label: 'Yellow Card' },
  { id: 'red', label: 'Red Card' },
  { id: 'sub', label: 'Substitution' },
  { id: 'lowerthird', label: 'Player Lower Third' },
  { id: 'coach', label: 'Coach' },
  { id: 'lineup', label: 'Lineup' },
  { id: 'stats', label: 'Statistics' },
  { id: 'var', label: 'VAR' },
  { id: 'clear', label: 'Clear All Graphics' },
];