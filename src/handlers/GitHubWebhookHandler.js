const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * GitHub Webhook Handler for CI/CD integration
 * Processes GitHub events and triggers appropriate workflows
 */
class GitHubWebhookHandler {
  constructor() {
    this.secret = process.env.GITHUB_WEBHOOK_SECRET;
    this.orchestrator = null; // Will be injected
  }

  static setOrchestrator(orchestrator) {
    GitHubWebhookHandler.prototype.orchestrator = orchestrator;
  }

  async handle(req, res) {
    try {
      // Verify webhook signature
      if (!this.verifySignature(req)) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.headers['x-github-event'];
      const payload = req.body;

      logger.info(`Received GitHub webhook: ${event}`, {
        repository: payload.repository?.full_name,
        action: payload.action,
        ref: payload.ref
      });

      const result = await this.processEvent(event, payload);
      
      res.json({
        received: true,
        event,
        processed: result.processed,
        workflows: result.workflows || []
      });

    } catch (error) {
      logger.error('GitHub webhook processing failed:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  verifySignature(req) {
    if (!this.secret) {
      logger.warn('No GitHub webhook secret configured');
      return true; // Allow in development
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      return false;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async processEvent(event, payload) {
    switch (event) {
      case 'push':
        return await this.handlePush(payload);
      
      case 'pull_request':
        return await this.handlePullRequest(payload);
      
      case 'workflow_run':
        return await this.handleWorkflowRun(payload);
      
      case 'check_suite':
        return await this.handleCheckSuite(payload);
      
      case 'deployment_status':
        return await this.handleDeploymentStatus(payload);
      
      case 'release':
        return await this.handleRelease(payload);
      
      default:
        logger.info(`Unhandled GitHub event: ${event}`);
        return { processed: false, reason: `Unhandled event: ${event}` };
    }
  }

  async handlePush(payload) {
    const { ref, repository, commits, pusher } = payload;
    const branch = ref.replace('refs/heads/', '');
    
    logger.info(`Push to ${repository.full_name}:${branch} by ${pusher.name}`);

    const workflows = [];

    // Trigger CI/CD for main branch pushes
    if (branch === 'main' || branch === 'master') {
      const ciResult = await this.orchestrator.triggerWorkflow('ci-cd-pipeline', {
        event: 'push',
        repository: repository.full_name,
        branch,
        commits,
        pusher: pusher.name,
        commit_sha: payload.after
      });
      workflows.push(ciResult);
    }

    // Trigger preview deployment for feature branches
    else if (branch.startsWith('feature/') || branch.startsWith('dev/')) {
      const previewResult = await this.orchestrator.triggerWorkflow('deployment-pipeline', {
        event: 'push',
        repository: repository.full_name,
        branch,
        environment: 'preview',
        commits,
        pusher: pusher.name
      });
      workflows.push(previewResult);
    }

    return {
      processed: true,
      workflows,
      context: { branch, commits: commits.length }
    };
  }

  async handlePullRequest(payload) {
    const { action, pull_request, repository } = payload;
    
    logger.info(`Pull request ${action} for ${repository.full_name}#${pull_request.number}`);

    const workflows = [];

    // Trigger CI for opened/synchronized PRs
    if (action === 'opened' || action === 'synchronize') {
      const ciResult = await this.orchestrator.triggerWorkflow('ci-cd-pipeline', {
        event: 'pull_request',
        action,
        repository: repository.full_name,
        pr_number: pull_request.number,
        branch: pull_request.head.ref,
        base_branch: pull_request.base.ref,
        commit_sha: pull_request.head.sha
      });
      workflows.push(ciResult);
    }

    // Trigger deployment for merged PRs to main
    else if (action === 'closed' && pull_request.merged && pull_request.base.ref === 'main') {
      const deployResult = await this.orchestrator.triggerWorkflow('deployment-pipeline', {
        event: 'pr_merged',
        repository: repository.full_name,
        pr_number: pull_request.number,
        branch: 'main',
        environment: 'staging'
      });
      workflows.push(deployResult);
    }

    return {
      processed: true,
      workflows,
      context: { action, pr_number: pull_request.number }
    };
  }

  async handleWorkflowRun(payload) {
    const { action, workflow_run, repository } = payload;
    
    logger.info(`Workflow run ${action}: ${workflow_run.name} (${workflow_run.conclusion})`);

    const workflows = [];

    // Handle completed workflows
    if (action === 'completed') {
      if (workflow_run.conclusion === 'success') {
        // Trigger deployment on successful CI
        if (workflow_run.name.includes('CI') || workflow_run.name.includes('test')) {
          const deployResult = await this.orchestrator.triggerWorkflow('deployment-pipeline', {
            event: 'ci_success',
            repository: repository.full_name,
            workflow_name: workflow_run.name,
            branch: workflow_run.head_branch,
            commit_sha: workflow_run.head_sha,
            environment: this.determineEnvironmentForBranch(workflow_run.head_branch)
          });
          workflows.push(deployResult);
        }
      } else if (workflow_run.conclusion === 'failure') {
        // Trigger error handling on failed workflows
        const errorResult = await this.orchestrator.triggerWorkflow('error-handling', {
          event: 'workflow_failure',
          repository: repository.full_name,
          workflow_name: workflow_run.name,
          workflow_id: workflow_run.id,
          branch: workflow_run.head_branch,
          error: `Workflow ${workflow_run.name} failed`
        });
        workflows.push(errorResult);
      }
    }

    return {
      processed: true,
      workflows,
      context: { action, conclusion: workflow_run.conclusion }
    };
  }

  async handleCheckSuite(payload) {
    const { action, check_suite, repository } = payload;
    
    logger.info(`Check suite ${action}: ${check_suite.conclusion}`);

    if (action === 'completed' && check_suite.conclusion === 'success') {
      // All checks passed - safe to deploy
      const workflows = [];
      
      const deployResult = await this.orchestrator.triggerWorkflow('deployment-pipeline', {
        event: 'checks_passed',
        repository: repository.full_name,
        branch: check_suite.head_branch,
        commit_sha: check_suite.head_sha,
        environment: this.determineEnvironmentForBranch(check_suite.head_branch)
      });
      workflows.push(deployResult);

      return {
        processed: true,
        workflows,
        context: { conclusion: check_suite.conclusion }
      };
    }

    return { processed: false, reason: 'Check suite not in completed/success state' };
  }

  async handleDeploymentStatus(payload) {
    const { deployment_status, deployment, repository } = payload;
    
    logger.info(`Deployment status: ${deployment_status.state} for ${deployment.environment}`);

    // Log deployment events for monitoring
    if (deployment_status.state === 'success') {
      logger.info(`Deployment successful: ${deployment.environment}`, {
        deployment_url: deployment_status.target_url,
        repository: repository.full_name
      });
    } else if (deployment_status.state === 'failure') {
      // Trigger error handling for failed deployments
      const errorResult = await this.orchestrator.triggerWorkflow('error-handling', {
        event: 'deployment_failure',
        repository: repository.full_name,
        environment: deployment.environment,
        deployment_id: deployment.id,
        error: deployment_status.description
      });

      return {
        processed: true,
        workflows: [errorResult],
        context: { state: deployment_status.state, environment: deployment.environment }
      };
    }

    return {
      processed: true,
      workflows: [],
      context: { state: deployment_status.state }
    };
  }

  async handleRelease(payload) {
    const { action, release, repository } = payload;
    
    if (action === 'published') {
      logger.info(`Release published: ${release.tag_name} for ${repository.full_name}`);

      // Trigger production deployment for releases
      const deployResult = await this.orchestrator.triggerWorkflow('deployment-pipeline', {
        event: 'release',
        repository: repository.full_name,
        tag: release.tag_name,
        environment: 'production',
        release_id: release.id
      });

      return {
        processed: true,
        workflows: [deployResult],
        context: { action, tag: release.tag_name }
      };
    }

    return { processed: false, reason: `Unhandled release action: ${action}` };
  }

  determineEnvironmentForBranch(branch) {
    if (branch === 'main' || branch === 'master') {
      return 'staging';
    } else if (branch.startsWith('release/')) {
      return 'production';
    } else {
      return 'preview';
    }
  }
}

module.exports = GitHubWebhookHandler;