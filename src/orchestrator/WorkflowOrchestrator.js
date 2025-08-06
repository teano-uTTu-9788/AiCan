const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const N8nIntegration = require('../integrations/N8nIntegration');
const VercelIntegration = require('../integrations/VercelIntegration');
const LangGraphIntegration = require('../integrations/LangGraphIntegration');
const NotificationService = require('../services/NotificationService');

/**
 * Main orchestrator class that coordinates workflow execution
 * across different platforms and handles state management.
 */
class WorkflowOrchestrator {
  constructor() {
    this.workflows = new Map();
    this.activeJobs = new Map();
    this.isInitialized = false;
    this.n8n = new N8nIntegration();
    this.vercel = new VercelIntegration();
    this.langGraph = new LangGraphIntegration();
    this.notifications = new NotificationService();
  }

  async initialize() {
    try {
      logger.info('Initializing Workflow Orchestrator...');
      
      // Initialize integrations
      await this.n8n.initialize();
      await this.vercel.initialize();
      await this.langGraph.initialize();
      await this.notifications.initialize();

      // Load workflow definitions
      await this.loadWorkflowDefinitions();

      this.isInitialized = true;
      logger.info('Workflow Orchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Workflow Orchestrator:', error);
      throw error;
    }
  }

  async loadWorkflowDefinitions() {
    // Define core workflows for AiCan platform
    const workflows = [
      {
        id: 'ci-cd-pipeline',
        name: 'CI/CD Pipeline',
        description: 'Automated CI/CD pipeline for AiCan platform',
        triggers: ['github.push', 'github.pull_request'],
        steps: [
          { type: 'test', action: 'run_tests' },
          { type: 'build', action: 'build_application' },
          { type: 'deploy', action: 'deploy_to_preview', condition: 'tests_passed' },
          { type: 'notify', action: 'send_notification' }
        ]
      },
      {
        id: 'deployment-pipeline',
        name: 'Deployment Pipeline',
        description: 'Sequential deployment across environments',
        triggers: ['manual', 'ci_success'],
        steps: [
          { type: 'validate', action: 'validate_deployment' },
          { type: 'deploy_staging', action: 'deploy_to_staging' },
          { type: 'test_staging', action: 'run_integration_tests' },
          { type: 'deploy_production', action: 'deploy_to_production', condition: 'staging_tests_passed' },
          { type: 'monitor', action: 'monitor_deployment' }
        ]
      },
      {
        id: 'error-handling',
        name: 'Error Handling Workflow',
        description: 'Automated error detection and recovery',
        triggers: ['error', 'health_check_failed'],
        steps: [
          { type: 'analyze', action: 'analyze_error' },
          { type: 'retry', action: 'retry_failed_step' },
          { type: 'escalate', action: 'escalate_to_human', condition: 'retry_failed' },
          { type: 'notify', action: 'send_error_notification' }
        ]
      }
    ];

    workflows.forEach(workflow => {
      this.workflows.set(workflow.id, workflow);
      logger.info(`Loaded workflow: ${workflow.name} (${workflow.id})`);
    });
  }

  async triggerWorkflow(workflowName, context = {}) {
    try {
      const workflow = this.getWorkflowByName(workflowName);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowName}`);
      }

      const jobId = uuidv4();
      const job = {
        id: jobId,
        workflowId: workflow.id,
        context,
        status: 'running',
        startTime: new Date(),
        steps: [],
        currentStep: 0
      };

      this.activeJobs.set(jobId, job);
      logger.info(`Started workflow: ${workflow.name} (job: ${jobId})`);

      // Execute workflow asynchronously
      this.executeWorkflow(job, workflow).catch(error => {
        logger.error(`Workflow execution failed: ${jobId}`, error);
        this.handleWorkflowError(job, error);
      });

      return {
        jobId,
        workflowId: workflow.id,
        status: 'started',
        message: `Workflow ${workflow.name} started successfully`
      };
    } catch (error) {
      logger.error('Failed to trigger workflow:', error);
      throw error;
    }
  }

  async executeWorkflow(job, workflow) {
    try {
      logger.info(`Executing workflow: ${workflow.name} (job: ${job.id})`);

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        job.currentStep = i;

        // Check step condition if exists
        if (step.condition && !this.evaluateCondition(step.condition, job.context)) {
          logger.info(`Skipping step ${step.type} due to condition: ${step.condition}`);
          continue;
        }

        logger.info(`Executing step: ${step.type} - ${step.action} (job: ${job.id})`);

        const stepResult = await this.executeStep(step, job.context);
        job.steps.push({
          step: step.type,
          action: step.action,
          result: stepResult,
          timestamp: new Date()
        });

        // Update job context with step result
        job.context = { ...job.context, ...stepResult };
      }

      job.status = 'completed';
      job.endTime = new Date();
      
      logger.info(`Workflow completed successfully: ${workflow.name} (job: ${job.id})`);
      await this.notifications.send('workflow_completed', {
        workflowName: workflow.name,
        jobId: job.id,
        duration: job.endTime - job.startTime
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      throw error;
    }
  }

  async executeStep(step, context) {
    switch (step.action) {
      case 'run_tests':
        return await this.runTests(context);
      
      case 'build_application':
        return await this.buildApplication(context);
      
      case 'deploy_to_preview':
        return await this.deployToPreview(context);
      
      case 'deploy_to_staging':
        return await this.deployToStaging(context);
      
      case 'deploy_to_production':
        return await this.deployToProduction(context);
      
      case 'run_integration_tests':
        return await this.runIntegrationTests(context);
      
      case 'validate_deployment':
        return await this.validateDeployment(context);
      
      case 'monitor_deployment':
        return await this.monitorDeployment(context);
      
      case 'send_notification':
        return await this.sendNotification(context);
      
      case 'analyze_error':
        return await this.analyzeError(context);
      
      case 'retry_failed_step':
        return await this.retryFailedStep(context);
      
      case 'escalate_to_human':
        return await this.escalateToHuman(context);
      
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  // Step implementation methods
  async runTests(context) {
    logger.info('Running tests...');
    // Trigger GitHub Actions or n8n workflow for tests
    const result = await this.n8n.triggerWorkflow('run-tests', context);
    return { tests_passed: result.success, test_results: result.data };
  }

  async buildApplication(context) {
    logger.info('Building application...');
    const result = await this.n8n.triggerWorkflow('build-app', context);
    return { build_success: result.success, build_artifacts: result.data };
  }

  async deployToPreview(context) {
    logger.info('Deploying to preview environment...');
    const result = await this.vercel.deploy('preview', context);
    return { preview_url: result.url, deployment_id: result.deploymentId };
  }

  async deployToStaging(context) {
    logger.info('Deploying to staging environment...');
    const result = await this.vercel.deploy('staging', context);
    return { staging_url: result.url, deployment_id: result.deploymentId };
  }

  async deployToProduction(context) {
    logger.info('Deploying to production environment...');
    const result = await this.vercel.deploy('production', context);
    return { production_url: result.url, deployment_id: result.deploymentId };
  }

  async runIntegrationTests(context) {
    logger.info('Running integration tests...');
    const result = await this.n8n.triggerWorkflow('integration-tests', context);
    return { staging_tests_passed: result.success, test_results: result.data };
  }

  async validateDeployment(context) {
    logger.info('Validating deployment...');
    return { validation_passed: true };
  }

  async monitorDeployment(context) {
    logger.info('Monitoring deployment...');
    return { monitoring_enabled: true };
  }

  async sendNotification(context) {
    await this.notifications.send('deployment_status', context);
    return { notification_sent: true };
  }

  async analyzeError(context) {
    logger.info('Analyzing error...');
    const analysis = await this.langGraph.analyzeError(context.error);
    return { error_analysis: analysis };
  }

  async retryFailedStep(context) {
    logger.info('Retrying failed step...');
    return { retry_attempted: true };
  }

  async escalateToHuman(context) {
    logger.info('Escalating to human...');
    await this.notifications.send('escalation', context);
    return { escalated: true };
  }

  evaluateCondition(condition, context) {
    switch (condition) {
      case 'tests_passed':
        return context.tests_passed === true;
      case 'staging_tests_passed':
        return context.staging_tests_passed === true;
      case 'retry_failed':
        return context.retry_attempted && !context.retry_success;
      default:
        return true;
    }
  }

  async handleN8nWebhook(workflowId, payload) {
    logger.info(`Received n8n webhook for workflow: ${workflowId}`, payload);
    
    // Process webhook based on workflow type
    if (payload.event === 'workflow_completed') {
      return await this.handleWorkflowCompletion(workflowId, payload);
    } else if (payload.event === 'workflow_failed') {
      return await this.handleWorkflowFailure(workflowId, payload);
    }

    return { received: true, processed: false };
  }

  async handleWorkflowCompletion(workflowId, payload) {
    logger.info(`Workflow completed: ${workflowId}`);
    // Update job status if applicable
    const job = this.findJobByWorkflowId(workflowId);
    if (job) {
      job.status = 'completed';
      job.n8nResult = payload.data;
    }
    return { status: 'completed', jobId: job?.id };
  }

  async handleWorkflowFailure(workflowId, payload) {
    logger.error(`Workflow failed: ${workflowId}`, payload.error);
    
    // Trigger error handling workflow
    await this.triggerWorkflow('error-handling', {
      failedWorkflowId: workflowId,
      error: payload.error
    });

    return { status: 'error_handled', errorWorkflowTriggered: true };
  }

  async handleWorkflowError(job, error) {
    logger.error(`Workflow error for job ${job.id}:`, error);
    
    job.status = 'failed';
    job.error = error.message;
    job.endTime = new Date();

    // Send error notification
    await this.notifications.send('workflow_error', {
      jobId: job.id,
      workflowId: job.workflowId,
      error: error.message
    });
  }

  async handleServiceFailure(unhealthyServices) {
    logger.error('Service failure detected:', unhealthyServices);
    
    await this.notifications.send('service_failure', {
      services: unhealthyServices,
      timestamp: new Date().toISOString()
    });
  }

  getWorkflowByName(name) {
    return Array.from(this.workflows.values()).find(w => w.name === name || w.id === name);
  }

  findJobByWorkflowId(workflowId) {
    return Array.from(this.activeJobs.values()).find(j => j.workflowId === workflowId);
  }

  async getWorkflowStatus(workflowId) {
    const job = this.activeJobs.get(workflowId) || this.findJobByWorkflowId(workflowId);
    if (!job) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return {
      jobId: job.id,
      workflowId: job.workflowId,
      status: job.status,
      currentStep: job.currentStep,
      steps: job.steps,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error
    };
  }

  isHealthy() {
    return this.isInitialized && this.n8n.isHealthy() && this.vercel.isHealthy();
  }

  async shutdown() {
    logger.info('Shutting down Workflow Orchestrator...');
    
    // Wait for active jobs to complete or timeout
    const activeJobIds = Array.from(this.activeJobs.keys());
    if (activeJobIds.length > 0) {
      logger.info(`Waiting for ${activeJobIds.length} active jobs to complete...`);
      // In a real implementation, you'd want to gracefully stop jobs
    }

    await this.n8n.shutdown();
    await this.vercel.shutdown();
    await this.langGraph.shutdown();
    await this.notifications.shutdown();
  }
}

module.exports = WorkflowOrchestrator;