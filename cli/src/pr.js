const simpleGit = require('simple-git');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const auth = require('./auth');

async function run({ message, base }) {
  const git = simpleGit(process.cwd());

  // ── Check we're in a git repo ──
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.error(chalk.red('\n❌ Not inside a git repository.'));
    console.log(chalk.gray('   Run this command inside your project folder.\n'));
    process.exit(1);
  }

  const token = auth.getToken();
  if (!token) {
    console.error(chalk.red('\n❌ No GitHub token found.'));
    console.log(chalk.gray('   Run: internx login --token ghp_yourtoken\n'));
    process.exit(1);
  }

  console.log(chalk.bold.blue('\n📤 InternX — Commit → Push → PR → AI Review\n'));

  // ── Step 1: Stage all changes ──
  const stageSpinner = ora('Staging changes...').start();
  try {
    await git.add('.');
    const status = await git.status();
    if (status.files.length === 0) {
      stageSpinner.warn(chalk.yellow('No changes to commit.'));
    } else {
      stageSpinner.succeed(chalk.green(`Staged ${status.files.length} file(s)`));
    }
  } catch (err) {
    stageSpinner.fail('Failed to stage changes');
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  // ── Step 2: Commit ──
  const commitSpinner = ora(`Committing: "${message}"...`).start();
  try {
    await git.commit(message);
    commitSpinner.succeed(chalk.green('Committed'));
  } catch (err) {
    commitSpinner.warn(chalk.yellow('Nothing new to commit, pushing existing commits...'));
  }

  // ── Step 3: Push ──
  const branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  const pushSpinner = ora(`Pushing branch ${chalk.cyan(branch)}...`).start();
  try {
    await git.push('origin', branch, ['--set-upstream']);
    pushSpinner.succeed(chalk.green(`Pushed → origin/${branch}`));
  } catch (err) {
    pushSpinner.fail(chalk.red('Push failed'));
    console.error(chalk.red(err.message));
    console.log(chalk.gray('\nPossible reasons:'));
    console.log(chalk.gray('  • No permission to push to this repo'));
    console.log(chalk.gray('  • Token does not have repo scope\n'));
    process.exit(1);
  }

  // ── Step 4: Get repo info from remote ──
  let owner, repo;
  try {
    const remote = (await git.remote(['get-url', 'origin'])).trim();
    const cleaned = remote.replace(/\.git$/, '').replace(/[\s/]+$/, '');
    const parts = cleaned.split(/github\.com[/:]/);
    if (parts.length < 2) throw new Error('Cannot parse repo from: ' + remote);
    const segments = parts[1].split('/');
    owner = segments[0];
    repo  = segments[1];
    if (!owner || !repo) throw new Error('Cannot parse repo from: ' + remote);
  } catch (err) {
    console.error(chalk.red('\n❌ Could not determine GitHub repo:'), err.message);
    process.exit(1);
  }

  // ── Helper: auto-detect task ID ──
  async function getTaskId() {
    // 1. Check env var first
    if (process.env.INTERNX_TASK_ID) return process.env.INTERNX_TASK_ID;

    // 2. Check local .internx.json in current folder
    try {
      const localConfig = JSON.parse(require('fs').readFileSync('.internx.json', 'utf8'));
      if (localConfig.task_id) return localConfig.task_id;
    } catch {}

    // 3. Auto-fetch from backend using InternX token
    try {
      const internxToken = auth.getInternxToken();
      if (internxToken) {
        const backendUrl = process.env.INTERNX_BACKEND_URL || 'http://localhost:8000';
        const taskRes = await axios.get(
          `${backendUrl}/api/tasks/active-task`,
          { headers: { Authorization: `Bearer ${internxToken}` } }
        );
        if (taskRes.data.task_id) {
          console.log(chalk.gray(`   Auto-detected task: ${taskRes.data.title}`));
          return taskRes.data.task_id;
        }
      }
    } catch {}

    return null;
  }

  // ── Helper: trigger AI review ──
  async function triggerReview(prNumber) {
    const reviewSpinner = ora('Requesting AI code review...').start();
    try {
      const diff = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3.diff',
          }
        }
      );

      const taskId = await getTaskId();
      if (!taskId) {
        reviewSpinner.warn(chalk.yellow('No active task found — skipping AI review.'));
        return;
      }

      const backendUrl = process.env.INTERNX_BACKEND_URL || 'http://localhost:8000';
      await axios.post(
        `${backendUrl}/api/mentor/review`,
        { task_id: taskId, pr_diff: diff.data },
        { headers: { 'Content-Type': 'application/json' } }
      );
      reviewSpinner.succeed(chalk.green('AI review started — check your task for feedback shortly.'));
    } catch (reviewErr) {
      reviewSpinner.warn(chalk.yellow('AI review could not be triggered (non-fatal).'));
      console.error(chalk.gray('   Review error: ' + reviewErr.message));
    }
  }

  // ── Step 5: Create Pull Request ──
  const prSpinner = ora('Creating Pull Request on GitHub...').start();
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: message,
        head: branch,
        base: base,
        body: `## 📝 Submitted via InternX\n\n**Branch:** \`${branch}\`\n\n${message}\n\n---\n*This PR was created automatically by the InternX CLI*`
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    prSpinner.succeed(chalk.green('Pull Request created!'));
    console.log(chalk.bold('\n🎉 Done!\n'));
    console.log(chalk.gray('   PR Title  : ') + chalk.white(message));
    console.log(chalk.gray('   Branch    : ') + chalk.white(`${branch} → ${base}`));
    console.log(chalk.gray('   PR Link   : ') + chalk.cyan.underline(response.data.html_url));

    await triggerReview(response.data.number);

    console.log(chalk.bold.gray('\n   AI review will begin shortly and post comments on your PR.\n'));

  } catch (err) {
    if (err.response?.status === 422) {
      prSpinner.warn(chalk.yellow('PR already exists — triggering review on existing PR...'));
      try {
        const prs = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=open`,
          { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
        );
        if (prs.data.length > 0) {
          const prNumber = prs.data[0].number;
          console.log(chalk.gray(`   Found existing PR #${prNumber}`));
          console.log(chalk.gray(`   PR Link: https://github.com/${owner}/${repo}/pull/${prNumber}`));
          await triggerReview(prNumber);
          console.log(chalk.bold.gray('\n   AI review will begin shortly.\n'));
        } else {
          console.log(chalk.yellow('   No open PR found for this branch.\n'));
        }
      } catch (e) {
        console.log(chalk.gray('   Could not find existing PR: ' + e.message));
      }
    } else if (err.response?.status === 401) {
      prSpinner.fail(chalk.red('Failed to create PR'));
      console.log(chalk.red('\n❌ Token unauthorized. Re-run: internx login --token ghp_xxx\n'));
      process.exit(1);
    } else {
      prSpinner.fail(chalk.red('Failed to create PR'));
      console.error(chalk.red(err.response?.data?.message || err.message));
      process.exit(1);
    }
  }
}

module.exports = { run };