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
  
  console.log(chalk.blue('🦞 OpenClaw Role-Based Wizard v1.0'));
  console.log(chalk.grey('Let\'s enhance your OpenClaw setup with role-specific templates!\n'));

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
    
    // Check if OpenClaw is installed
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('which openclaw');
    } catch {
      try {
        await execAsync('npx openclaw --version');
      } catch {
        throw new Error('OpenClaw not found. Please install OpenClaw first: npm install -g openclaw@latest');
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
    
    // Configure official OpenClaw skills for this role
    await configureSkillsForRole(config, workspacePath);
    
    spinner.succeed('Workspace created successfully!');
    
    return workspacePath;
  } catch (error) {
    spinner.fail('Workspace setup failed');
    throw error;
  }
}

async function configureSkillsForRole(config, workspacePath) {
  const spinner = ora('Configuring OpenClaw skills using official format...').start();
  
  try {
    // Generate the exact OpenClaw skills configuration format
    // This matches ~/.openclaw/openclaw.json skills section format
    const skillsConfig = {
      skills: {
        entries: {}
      }
    };
    
    // Extract skills from the template's config.skills.entries or config.skills array
    const skills = config.template.skills.entries ? 
      Object.keys(config.template.skills.entries) : 
      config.template.skills;
    
    for (const skill of skills) {
      spinner.text = `Configuring official OpenClaw skill: ${skill}`;
      
      // Use exact OpenClaw configuration format
      skillsConfig.skills.entries[skill] = { enabled: true };
      
      // If the template has specific config for this skill, use it
      if (config.template.skills.entries && config.template.skills.entries[skill]) {
        skillsConfig.skills.entries[skill] = {
          enabled: true,
          ...config.template.skills.entries[skill]
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Write the OpenClaw-compatible skills config snippet
    const configSnippet = `
# Add this to your ~/.openclaw/openclaw.json file:
${JSON.stringify(skillsConfig, null, 2)}

# Or run: openclaw config patch --raw '${JSON.stringify(skillsConfig)}'
`;
    
    await fs.writeFile(path.join(workspacePath, 'openclaw-skills-config.json'), configSnippet);
    
    spinner.succeed(`✅ Generated OpenClaw skills configuration for ${skills.length} skills`);
    
    // Show user what they get
    console.log(chalk.grey(`   Skills configured: ${skills.join(', ')}`));
    console.log(chalk.grey(`   Configuration saved to: ~/clawd/openclaw-skills-config.json`));
    console.log(chalk.yellow(`   💡 To apply: openclaw config patch --raw '${JSON.stringify(skillsConfig)}'`));
    
  } catch (error) {
    spinner.fail('Skill configuration failed');
    throw error;
  }
}

async function displaySuccess(config) {
  console.log('\n' + chalk.green('🎉 Success! Your AI employee is ready to work!'));
  console.log('\n' + chalk.blue('📋 What was set up:'));
  
  console.log('   • Role Template:', config.user.type);
  console.log('   • OpenClaw Skills Config Generated:', (config.template.skills.entries ? Object.keys(config.template.skills.entries) : config.template.skills).join(', '));
  console.log('   • Workspace Enhanced:', workspacePath);
  console.log('   • Configuration Files Created: AGENTS.md, HEARTBEAT.md, role templates');
  
  console.log('\n' + chalk.blue('🚀 Next steps:'));
  console.log('   1. Start OpenClaw:', chalk.green('openclaw gateway start'));
  console.log('   2. Open workspace:', chalk.green('cd ~/clawd'));
  console.log('   3. Check your setup:', chalk.green('cat ~/clawd/morning-brief.md'));
  
  console.log('\n💡 Need help? Check the documentation or join our Discord community.');
}

module.exports = { runWizard };