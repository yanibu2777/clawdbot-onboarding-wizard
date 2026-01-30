const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');

async function generateSetup(config, workspacePath) {
  // Generate OpenClaw workspace files (following official structure)
  await generateOpenClawWorkspace(config, workspacePath);
  
  // Generate role-specific AGENTS.md
  await generateAgentsFile(config, workspacePath);
  
  // Generate role-specific HEARTBEAT.md
  await generateHeartbeatFile(config, workspacePath);
  
  // Generate automation templates
  await generateAutomationTemplates(config, workspacePath);
  
  // Generate initial morning brief
  await generateMorningBrief(config, workspacePath);
  
  return workspacePath;
}

async function createWorkspaceStructure(workspacePath) {
  const directories = [
    'config',
    'automations',
    'workflows', 
    'integrations',
    'docs',
    'logs'
  ];
  
  for (const dir of directories) {
    await fs.ensureDir(path.join(workspacePath, dir));
  }
}

async function generateClawdbotConfig(config, workspacePath) {
  const clawdbotConfig = {
    workspace: {
      name: config.workspace.name,
      description: config.workspace.description,
      created: config.created,
      user_type: config.user.type
    },
    skills: config.workspace.skills.map(skill => ({
      name: skill,
      enabled: true,
      auto_install: true
    })),
    integrations: config.integrations,
    automations: config.template.automations,
    workflows: config.template.workflows || []
  };
  
  const configPath = path.join(workspacePath, 'config', 'clawdbot.yaml');
  await fs.writeFile(configPath, yaml.stringify(clawdbotConfig));
  
  return configPath;
}

async function generateAutomations(config, workspacePath) {
  const automationsPath = path.join(workspacePath, 'automations');
  
  // Generate morning brief automation
  const morningBrief = {
    name: 'Morning Intelligence Brief',
    schedule: config.template.automations.morning_brief?.schedule || '8:00 AM daily',
    description: 'Daily briefing with relevant updates and priorities',
    actions: [
      {
        type: 'collect_data',
        sources: config.template.automations.morning_brief?.includes || []
      },
      {
        type: 'generate_summary',
        format: 'markdown',
        output: 'morning-brief.md'
      },
      {
        type: 'notify',
        method: 'console',
        message: 'Your morning brief is ready!'
      }
    ]
  };
  
  await fs.writeFile(
    path.join(automationsPath, 'morning-brief.yaml'),
    yaml.stringify(morningBrief)
  );
  
  // Generate user-type specific automations
  if (config.user.type === 'founder') {
    await generateFounderAutomations(config, automationsPath);
  } else if (config.user.type === 'engineer') {
    await generateEngineerAutomations(config, automationsPath);
  }
}

async function generateFounderAutomations(config, automationsPath) {
  const investorUpdate = {
    name: 'Weekly Investor Update Prep',
    schedule: 'Weekly Friday 4:00 PM',
    description: 'Prepare weekly investor update with key metrics and highlights',
    actions: [
      {
        type: 'collect_metrics',
        sources: ['revenue', 'user_growth', 'team_updates']
      },
      {
        type: 'generate_report',
        template: 'investor_update',
        output: 'weekly-investor-update.md'
      }
    ]
  };
  
  await fs.writeFile(
    path.join(automationsPath, 'investor-update.yaml'),
    yaml.stringify(investorUpdate)
  );
}

async function generateEngineerAutomations(config, automationsPath) {
  const codeReview = {
    name: 'Automated Code Review Assistant',
    schedule: 'On PR creation',
    description: 'Assist with code reviews and quality checks',
    actions: [
      {
        type: 'analyze_code',
        checks: ['security', 'performance', 'style', 'tests']
      },
      {
        type: 'generate_feedback',
        format: 'github_comment',
        output: 'pr-review-comments.md'
      }
    ]
  };
  
  await fs.writeFile(
    path.join(automationsPath, 'code-review.yaml'),
    yaml.stringify(codeReview)
  );
}

async function generateDocumentation(config, workspacePath) {
  const readme = `# ${config.workspace.name}

Your AI Employee workspace, configured for ${config.user.type} workflows.

## 🎯 Setup Summary

- **User Type:** ${config.user.type}
- **Created:** ${new Date(config.created).toLocaleDateString()}
- **Skills Installed:** ${config.workspace.skills.join(', ')}
- **Integrations:** ${Object.keys(config.integrations).join(', ')}

## 🚀 Getting Started

1. **Start Clawdbot:** \`clawdbot gateway start\`
2. **Check your morning brief:** \`cat morning-brief.md\`
3. **View automations:** \`ls automations/\`
4. **Customize workflows:** Edit files in \`workflows/\`

## 📋 Automations

${Object.entries(config.template.automations).map(([name, automation]) => 
  `### ${name}\n- **Schedule:** ${automation.schedule}\n- **Includes:** ${automation.includes?.join(', ') || 'Custom workflow'}\n`
).join('\n')}

## 🔧 Configuration

All configuration files are in the \`config/\` directory. Main configuration is in \`config/clawdbot.yaml\`.

## 📊 Goals Tracking

Your selected goals:
${config.user.goals?.map(goal => `- ${goal}`).join('\n') || '- General automation'}

## 📞 Support

- Documentation: [docs/](./docs/)
- Logs: [logs/](./logs/)
- Community: [Discord](https://discord.gg/clawdbot)

---

*Generated by Clawdbot Onboarding Wizard v1.0*
`;
  
  await fs.writeFile(path.join(workspacePath, 'README.md'), readme);
}

async function generateMorningBrief(config, workspacePath) {
  const today = new Date().toLocaleDateString();
  
  const morningBrief = `# Morning Brief - ${today}

*Your AI employee has prepared this briefing*

## 🎯 Today's Priorities

${config.user.goals?.map(goal => `- Work on: ${goal}`).join('\n') || '- General productivity tasks'}

## 📅 Schedule Overview

*Calendar integration will populate this section*

## 📊 Key Metrics

${config.user.type === 'founder' ? `
- Revenue tracking: *Setup pending*
- User growth: *Setup pending*
- Team updates: *Setup pending*
` : config.user.type === 'engineer' ? `
- PR reviews pending: *Setup pending*
- GitHub notifications: *Setup pending*
- CI/CD status: *Setup pending*
` : `
- Daily goals: *Setup pending*
- Important updates: *Setup pending*
`}

## 🔔 Notifications

- ✅ AI employee workspace configured
- ⏳ Integrations pending: ${Object.keys(config.integrations).join(', ')}
- 📋 Automations ready: ${Object.keys(config.template.automations).length} workflows

## 💡 Suggestions

1. Review and customize your automations in \`automations/\`
2. Set up integrations for: ${Object.keys(config.integrations).join(', ')}
3. Check back tomorrow for your first real brief!

---

*This briefing will improve as your integrations are configured*
`;

  await fs.writeFile(path.join(workspacePath, 'morning-brief.md'), morningBrief);
}

async function generateOpenClawWorkspace(config, workspacePath) {
  // OpenClaw expects specific files in workspace root
  // We enhance existing workspace or create structure as needed
  await fs.ensureDir(workspacePath);
}

async function generateAgentsFile(config, workspacePath) {
  // Generate role-specific AGENTS.md (loaded by OpenClaw every session)
  const template = config.template;
  
  const agentsContent = `# AGENTS.md - ${template.name} Operating Instructions

${template.description}

## 🎯 Your Role: ${template.name}

You are an AI assistant specialized for ${config.user.type} workflows. Your primary focus areas:

${template.automations ? Object.entries(template.automations).map(([name, automation]) => 
  `### ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Schedule:** ${automation.schedule}
- **Priority:** ${automation.priority || 'medium'}
- **Description:** ${automation.description || 'Automated workflow'}
${automation.includes ? automation.includes.map(item => `  - ${item}`).join('\n') : ''}
`).join('\n') : ''}

## 💡 Demo Scenarios

${template.demo_scenarios ? template.demo_scenarios.map(scenario => 
  `### ${scenario.name}
${scenario.description}
**Time saved:** ${scenario.time_saved}
`).join('\n') : ''}

## ⚡ Impact Metrics

${template.impact_metrics ? `
**Expected Time Savings:**
- Daily: ${template.impact_metrics.daily_time_saved}
- Weekly: ${template.impact_metrics.weekly_time_saved}  
- Monthly: ${template.impact_metrics.monthly_time_saved}

**Primary Benefits:**
${template.impact_metrics.primary_benefits ? template.impact_metrics.primary_benefits.map(benefit => `- ${benefit}`).join('\n') : ''}
` : ''}

## 🛠️ Available Skills

You have access to these OpenClaw skills:
${template.skills.entries ? Object.keys(template.skills.entries).map(skill => `- **${skill}**: ${template.skills.entries[skill].description || 'Official OpenClaw skill'}`).join('\n') : template.skills.map(skill => `- **${skill}**: Official OpenClaw skill`).join('\n')}

## 📋 Daily Operating Principles

1. **Proactive Monitoring**: Check metrics and systems before issues arise
2. **Data-Driven Insights**: Always provide context and trends, not just numbers
3. **Actionable Recommendations**: Every brief should include specific next steps
4. **Time-Conscious**: Prioritize high-impact activities that save the most time
5. **Communication**: Keep updates clear, concise, and decision-focused

## 🚨 Alert Thresholds

Be proactive about flagging:
- Metrics trending negative >2 days
- Team blockers that could impact deadlines
- Competitive moves requiring immediate response
- Budget/runway concerns requiring founder attention

---

*This file is loaded every OpenClaw session. Update it as your needs evolve.*
`;

  await fs.writeFile(path.join(workspacePath, 'AGENTS.md'), agentsContent);
}

async function generateHeartbeatFile(config, workspacePath) {
  // Generate role-specific HEARTBEAT.md (periodic automated tasks)
  const template = config.template;
  
  const heartbeatContent = `# HEARTBEAT.md - ${template.name} Automation

Automated periodic tasks for ${config.user.type} workflows.

## 🔄 Daily Automation Tasks

${template.automations ? Object.entries(template.automations).map(([name, automation]) => {
    if (automation.schedule.includes('daily')) {
      return `### ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **When:** ${automation.schedule}
- **Priority:** ${automation.priority || 'medium'}
- **What:** ${automation.description}
- **Actions:**
${automation.includes ? automation.includes.map(item => `  - Check and report on: ${item}`).join('\n') : '  - Execute automation workflow'}
`;
    }
  }).filter(Boolean).join('\n') : ''}

## 📊 Weekly Tasks

${template.automations ? Object.entries(template.automations).map(([name, automation]) => {
    if (automation.schedule.includes('Weekly') || automation.schedule.includes('weekly')) {
      return `### ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **When:** ${automation.schedule}
- **Priority:** ${automation.priority || 'medium'}  
- **What:** ${automation.description}
- **Actions:**
${automation.includes ? automation.includes.map(item => `  - Analyze and summarize: ${item}`).join('\n') : '  - Execute weekly workflow'}
`;
    }
  }).filter(Boolean).join('\n') : ''}

## 📅 Monthly/Periodic Tasks

${template.automations ? Object.entries(template.automations).map(([name, automation]) => {
    if (automation.schedule.includes('Monthly') || automation.schedule.includes('monthly')) {
      return `### ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **When:** ${automation.schedule}
- **Priority:** ${automation.priority || 'medium'}
- **What:** ${automation.description}
- **Actions:**
${automation.includes ? automation.includes.map(item => `  - Deep analysis of: ${item}`).join('\n') : '  - Execute periodic workflow'}
`;
    }
  }).filter(Boolean).join('\n') : ''}

## ⚡ Proactive Monitoring

Between scheduled tasks, monitor for:
- Critical metrics falling outside normal ranges
- Team blockers that need immediate escalation  
- Competitive intelligence requiring rapid response
- Opportunities for strategic advantage

## 🎯 Success Metrics

Track automation effectiveness:
- Time saved per task category
- Issues caught proactively vs. reactively
- Decision speed improvement
- Overall ${config.user.type} productivity gains

---

*Keep this file focused and actionable. OpenClaw reads this for automated tasks.*
`;

  await fs.writeFile(path.join(workspacePath, 'HEARTBEAT.md'), heartbeatContent);
}

async function generateAutomationTemplates(config, workspacePath) {
  // Create templates directory for role-specific workflows
  const templatesDir = path.join(workspacePath, 'templates');
  await fs.ensureDir(templatesDir);
  
  // Generate role-specific automation examples
  const template = config.template;
  const automationExample = {
    name: `${config.user.type}_automation_example`,
    description: `Example automation workflow for ${config.user.type}`,
    template: template,
    usage_instructions: `
# How to Use This Template

1. Copy this template for new automations
2. Customize the triggers and actions for your needs
3. Test with small data sets first
4. Scale up once working properly

# OpenClaw Integration

This template is designed to work with OpenClaw's automation system.
Configure skills in ~/.openclaw/openclaw.json using the provided configuration.
`,
    skills_needed: template.skills.entries ? Object.keys(template.skills.entries) : template.skills
  };
  
  await fs.writeFile(
    path.join(templatesDir, `${config.user.type}-automation-template.json`),
    JSON.stringify(automationExample, null, 2)
  );
}

module.exports = { generateSetup };