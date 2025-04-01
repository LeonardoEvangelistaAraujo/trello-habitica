import Storage from './storage';

export default class Task {
  constructor(trello, storage = new Storage(trello)) {
    this.t = trello;
    this.storage = storage;
  }

  // In some cases user stats response is missing the toNextLevel field
  // so it's better to calculate it manually with this formula:
  // https://habitica.fandom.com/wiki/Experience_Level_Chart
  async calculateExpToNextLevel(lvl) {
    const currentUser = await this.storage.getUser();

    if (currentUser.lvl === lvl && currentUser.expToNextLevel)
      return currentUser.expToNextLevel;

    const exp = 0.25 * lvl ** 2 + 10 * lvl + 139.75;
    const remainder = exp % 10;
    return exp - remainder + Math.round(remainder / 10) * 10; // rounded to the closest 10
  }

  async updateStats({ gp, exp, lvl, hp }) {
    const gold = gp;

    this.notifyAboutStats({ gold, exp });
    const expToNextLevel = await this.calculateExpToNextLevel(lvl);
    return this.storage.setUser({ lvl, gold, exp, expToNextLevel, hp });
  }

  async notifyAboutStats({ exp, gold }) {
    const settings = await this.storage.getSettings();
    if (!settings.showStatsNotifications) return undefined;

    const currentUser = await this.storage.getUser();
    const expDiff = currentUser.exp ? exp - currentUser.exp : exp;
    const goldDiff = currentUser.gold ? gold - currentUser.gold : gold;

    const outcome = goldDiff > 0 ? 'gained' : 'lost';
    const display = goldDiff > 0 ? 'success' : 'error';

    return this.t.alert({
      message: `You ${outcome} ${expDiff} exp and ${goldDiff.toFixed(2)} gold.`,
      display,
      duration: 5 // min is 5
    });
  }
}
