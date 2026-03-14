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

  console.log(chalk.bold.blue('\n📤 InternX — Submit for Review\n'));

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
    // If nothing to commit, keep going
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
    // Handles both https and ssh formats
    const match = remote.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (!match) throw new Error('Could not parse GitHub repo from remote URL');
    owner = match[1];
    repo  = match[2];
  } catch (err) {
    console.error(chalk.red('\n❌ Could not determine GitHub repo:'), err.message);
    process.exit(1);
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
    console.log(chalk.bold.gray('\n   AI review will begin shortly and post comments on your PR.\n'));

  } catch (err) {
    prSpinner.fail(chalk.red('Failed to create PR'));

    if (err.response?.status === 422) {
      // PR already exists — fetch and show the existing one
      try {
        const existing = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=open`,
          { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
        );
        if (existing.data?.length > 0) {
          prSpinner.succeed(chalk.green('PR already exists!'));
          console.log(chalk.bold('\n🎉 Done!\n'));
          console.log(chalk.gray('   PR Title  : ') + chalk.white(existing.data[0].title));
          console.log(chalk.gray('   Branch    : ') + chalk.white(`${branch} → ${base}`));
          console.log(chalk.gray('   PR Link   : ') + chalk.cyan.underline(existing.data[0].html_url));
          console.log(chalk.bold.gray('\n   AI review will begin shortly and post comments on your PR.\n'));
          return;
        }
      } catch { /* fall through to generic message */ }
      console.log(chalk.yellow('\n⚠️  A PR from this branch already exists.'));
      console.log(chalk.gray(`   Check: https://github.com/${owner}/${repo}/pulls\n`));
    } else if (err.response?.status === 401) {
      console.log(chalk.red('\n❌ Token unauthorized. Re-run: internx login --token ghp_xxx\n'));
    } else {
      console.error(chalk.red(err.response?.data?.message || err.message));
    }
    process.exit(1);
  }
}

module.exports = { run };