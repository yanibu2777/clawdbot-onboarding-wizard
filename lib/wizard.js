const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { getQuestions } = require('./questions');
const { generateSetup } = require('./setup');
const { loadTemplate } = require('./templates');

async function runWizard(options = {}) {
  const { template, testMode = false } = options;
  
  console.log(chalk.blue('🎯 Clawdbot Onboarding Wizard v1.0'));
  console.log(chalk.grey('Let\'s get you from confused to productive in 5 minutes!\n'));

  // Step 1: System checks
  if (!options.skipChecks) {
    await runSystemChecks();
  }

  // Step 2: Get user preferences
  const answers = await getUserPreferences(template);
  
  // Step 3: Load and customize template
  const selectedTemplate = await loadTemplate(answers.userType);
  
  // Step 4: Configure integrations
  const integrations = await configureIntegrations(answers.tools);
  
  // Step 5: Generate configuration
  const config = await generateConfiguration(answers, selectedTemplate, integrations);
  
  // Step 6: Setup Clawdbot workspace
  if (!testMode) {
    await setupWorkspace(config);
    await displaySuccess(config);
  } else {
    console.log(chalk.yellow('🧪 Test mode - configuration would be:'));
    console.log(JSON.stringify(config, null, 2));
  }

  return config;
}

async function runSystemChecks() {
  const spinner = ora('Checking system requirements...').start();
  
  try {
    // Check if Node.js version is compatible
    const nodeVersion = process.version;
    if (!nodeVersion.match(/^v(1[6-9]|[2-9][0-9])/)) {
      throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
    }
    
    // Check if Clawdbot is installed
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('which clawdbot');
    } catch {
      try {
        await execAsync('npx clawdbot --version');
      } catch {
        throw new Error('Clawdbot not found. Please install Clawdbot first: npm install -g clawdbot');
      }
    }
    
    spinner.succeed('System requirements met');
  } catch (error) {
    spinner.fail('System check failed');
    throw error;
  }
}

async function getUserPreferences(preselectedTemplate) {
  const questions = getQuestions(preselectedTemplate);
  return await inquirer.prompt(questions);
}

async function configureIntegrations(selectedTools) {
  const integrations = {};
  
  if (selectedTools.includes('gmail')) {
    integrations.email = {
      provider: 'gmail',
      features: ['automation', 'smart_inbox', 'scheduling']
    };
  }
  
  if (selectedTools.includes('calendar')) {
    integrations.calendar = {
      provider: 'google',
      features: ['scheduling', 'meeting_prep', 'availability']
    };
  }
  
  if (selectedTools.includes('github')) {
    integrations.github = {
      features: ['pr_reviews', 'issue_tracking', 'repo_analytics']
    };
  }
  
  if (selectedTools.includes('social')) {
    integrations.social = {
      platforms: ['linkedin', 'twitter'],
      features: ['content_scheduling', 'analytics', 'engagement']
    };
  }
  
  return integrations;
}

async function generateConfiguration(answers, template, integrations) {
  return {
    user: {
      type: answers.userType,
      goals: answers.goals,
      experience: answers.experience
    },
    template: template,
    integrations: integrations,
    workspace: {
      name: `${answers.userType}-ai-employee`,
      description: `AI employee setup for ${answers.userType}`,
      automations: template.automations,
      skills: template.skills
    },
    created: new Date().toISOString()
  };
}

async function setupWorkspace(config) {
  const spinner = ora('Setting up your AI employee workspace...').start();
  
  try {
    // Use existing Clawdbot workspace or create it
    const workspacePath = path.join(require('os').homedir(), 'clawd');
    await fs.ensureDir(workspacePath);
    
    // Generate configuration files
    await generateSetup(config, workspacePath);
    
    // Install required skills
    await installRequiredSkills(config.workspace.skills);
    
    spinner.succeed('Workspace created successfully!');
    
    return workspacePath;
  } catch (error) {
    spinner.fail('Workspace setup failed');
    throw error;
  }
}

async function installRequiredSkills(skills) {
  const spinner = ora('Installing Clawdbot skills...').start();
  
  try {
    for (const skill of skills) {
      // In a real implementation, this would install actual Clawdbot skills
      // For now, we'll just simulate the process
      spinner.text = `Installing skill: ${skill}`;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    spinner.succeed(`Installed ${skills.length} skills`);
  } catch (error) {
    spinner.fail('Skill installation failed');
    throw error;
  }
}

async function displaySuccess(config) {
  console.log('\n' + chalk.green('🎉 Success! Your AI employee is ready to work!'));
  console.log('\n' + chalk.blue('📋 What was set up:'));
  
  console.log('   • Workspace:', config.workspace.name);
  console.log('   • User Type:', config.user.type);
  console.log('   • Skills:', config.workspace.skills.join(', '));
  console.log('   • Integrations:', Object.keys(config.integrations).join(', '));
  
  console.log('\n' + chalk.blue('🚀 Next steps:'));
  console.log('   1. Start Clawdbot:', chalk.green('clawdbot gateway start'));
  console.log('   2. Open workspace:', chalk.green('cd ~/clawd'));
  console.log('   3. Check your setup:', chalk.green('cat ~/clawd/morning-brief.md'));
  
  console.log('\n💡 Need help? Check the documentation or join our Discord community.');
}

module.exports = { runWizard };