import { Launcher } from 'chrome-launcher';
import { execFileSync } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';

const budget = JSON.parse(await readFile(new URL('../performance-budget.json', import.meta.url), 'utf8'));
if (!process.env.GITHUB_ENV) throw new Error('GitHub environment is unavailable');
let selected;
const observed = [];
for (const executable of Launcher.getInstallations()) {
    try {
        const version = execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim();
        const major = Number(version.match(/\b(\d+)\.\d+\.\d+\.\d+/)?.[1]);
        observed.push(major);
        if (budget.ciBaselines?.[major]) { selected = { executable, major }; break; }
    } catch { /* Check the remaining installed browsers before reporting unavailable evidence. */ }
}
if (!selected) throw new Error(`No reviewed CI browser found (observed: ${observed.join(', ')}); record an isolated three-run baseline before release.`);
await appendFile(process.env.GITHUB_ENV, `CHROME_PATH=${selected.executable}\n`);
console.log(`Selected recorded CI Chrome ${selected.major}; existing browser sandbox configuration retained.`);
