const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chalk = require('chalk');
const ora = require('ora');
const auth = require('./auth');

// ─────────────────────────────────────────────────────────────
// Recursively creates folders and files from a nested object.
//
// DB format:
// {
//   "payvault-payments-service": {
//     "app": {
//       "core": ["config.py", "database.py"],   ← array = files inside dir
//       "main.py": null                          ← null  = empty file
//     },
//     "README.md": null
//   }
// }
//
// Rules:
//   key + object value → directory, recurse
//   key + array value  → directory, each item in array is an empty file
//   key + null value   → empty file
// ─────────────────────────────────────────────────────────────
function createFolderStructure(projectDir, structure) {
  let created = 0;
  let skipped = 0;

  function walk(currentDir, node) {
    if (Array.isArray(node)) {
      // Array of filenames — create each as an empty file in currentDir
      if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });
      for (const filename of node) {
        const fullPath = path.join(currentDir, filename);
        if (!fs.existsSync(fullPath)) {
          fs.writeFileSync(fullPath, '', 'utf8');
          created++;
        } else {
          skipped++;
        }
      }
    } else if (typeof node === 'object' && node !== null) {
      // Object — each key is a file (null) or subdirectory (object/array)
      if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });
      for (const [key, value] of Object.entries(node)) {
        const fullPath = path.join(currentDir, key);
        if (value === null) {
          // null → empty file
          if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, '', 'utf8');
            created++;
          } else {
            skipped++;
          }
        } else {
          // object or array → directory, recurse into it
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            created++;
          } else {
            skipped++;
          }
          walk(fullPath, value);
        }
      }
    }
  }

  walk(projectDir, structure);
  return { created, skipped };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function run({ repo, branch, token, folderStructure }) {
  console.log(chalk.bold.blue('\n🚀 InternX Project Setup\n'));

  // ── Resolve token ──
  const githubToken = token || auth.getToken();
  if (!githubToken) {
    console.log(chalk.yellow('⚠️  No GitHub token found.'));
    console.log(chalk.gray('   Run: internx login --token ghp_yourtoken\n'));
  }

  // ── Paths ──
  const projectName = repo.split('/')[1];
  const baseDir     = path.join(os.homedir(), 'internx-projects');
  const projectDir  = path.join(baseDir, projectName);

  // ── Step 1: Create base folder ──
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // ── Step 2: Clone ──
  if (fs.existsSync(projectDir)) {
    console.log(chalk.yellow(`📁 Project already exists at: ${projectDir}`));
    console.log(chalk.gray('   Skipping clone, opening VS Code...\n'));
  } else {
    const cloneUrl = githubToken
      ? `https://${githubToken}@github.com/${repo}.git`
      : `https://github.com/${repo}.git`;

    const cloneSpinner = ora(`Cloning ${chalk.cyan(repo)}...`).start();
    try {
      await simpleGit().clone(cloneUrl, projectDir);
      cloneSpinner.succeed(chalk.green(`Cloned → ${projectDir}`));
    } catch (err) {
      cloneSpinner.fail(chalk.red('Clone failed'));
      console.error(chalk.red(err.message));
      console.log(chalk.gray('\nPossible reasons:'));
      console.log(chalk.gray('  • Repo does not exist or is private'));
      console.log(chalk.gray('  • Token missing or invalid'));
      console.log(chalk.gray('  • No internet connection\n'));
      process.exit(1);
    }

    // ── Step 3: Create and checkout branch ──
    const branchSpinner = ora(`Creating branch ${chalk.cyan(branch)}...`).start();
    try {
      const repoGit = simpleGit(projectDir);
      const remoteBranches = await repoGit.branch(['-r']);
      const branchExists = remoteBranches.all.some(b => b.includes(branch));

      if (branchExists) {
        await repoGit.checkout(branch);
        branchSpinner.succeed(chalk.green(`Checked out existing branch: ${branch}`));
      } else {
        await repoGit.checkoutLocalBranch(branch);
        branchSpinner.succeed(chalk.green(`Created new branch: ${branch}`));
      }
    } catch (err) {
      branchSpinner.fail(chalk.red('Branch creation failed'));
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  }

  // ── Step 4: Load folder structure ──
  // Runs every time (outside clone block) so re-opening works too.
  // Priority: URL param → internx.json in repo root → nothing
  if (!folderStructure) {
    const configPath = path.join(projectDir, 'internx.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        folderStructure = config.folderStructure ?? null;
      } catch {
        // malformed JSON — skip silently
      }
    }
  }

  // ── Step 5: Create folder structure ──
  // Safe to run every time — skips anything that already exists.
  if (folderStructure && typeof folderStructure === 'object') {
    const structSpinner = ora('Creating folder structure...').start();
    try {
      const { created, skipped } = createFolderStructure(projectDir, folderStructure);
      structSpinner.succeed(
        chalk.green('Folder structure created') +
        chalk.gray(` (${created} new, ${skipped} already existed)`)
      );
    } catch (err) {
      structSpinner.fail(chalk.red('Folder structure failed'));
      console.error(chalk.red(err.message));
      // Non-fatal — keep going
    }
  }

  // ── Step 6: Open VS Code ──
  const vsSpinner = ora('Opening VS Code...').start();
  try {
    const { spawn } = require('child_process');
    const child = spawn('code', [projectDir], {
      detached: true,
      stdio:    'ignore',
      shell:    true,
    });
    child.unref();
    await new Promise(resolve => setTimeout(resolve, 2000));
    vsSpinner.succeed(chalk.green('VS Code opened!'));

    console.log(chalk.bold('\n✅ You\'re all set!\n'));
    console.log(chalk.gray('   Project : ') + chalk.white(repo));
    console.log(chalk.gray('   Branch  : ') + chalk.white(branch));
    console.log(chalk.gray('   Folder  : ') + chalk.white(projectDir));
    console.log(chalk.bold.gray('\n   When done, run in VS Code terminal:'));
    console.log(chalk.cyan(`   internx pr --message "Your work description"\n`));

  } catch (err) {
    vsSpinner.fail(chalk.red('Could not open VS Code'));
    console.log(chalk.yellow('\n⚠️  Make sure VS Code is installed and "code" is in your PATH.'));
    console.log(chalk.gray('   VS Code → Command Palette → "Shell Command: Install \'code\' command in PATH"'));
    console.log(chalk.gray(`\n   Then open manually: code "${projectDir}"\n`));
  }
}

module.exports = { run };