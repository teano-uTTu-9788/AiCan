#!/bin/bash

# Example deployment script demonstrating the Deployment Agent usage

set -e

echo "🚀 AiCan Deployment Agent Example"
echo "================================="

# Configuration
DEPLOYMENT_AGENT_URL="http://localhost:3000"
PROJECT_NAME="AiCan Example App"
ENVIRONMENT="production"
BRANCH="main"
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "example-commit-sha")

# Check if deployment agent is running
echo "📡 Checking Deployment Agent status..."
if ! curl -f -s "${DEPLOYMENT_AGENT_URL}/health" > /dev/null; then
    echo "❌ Deployment Agent is not running at ${DEPLOYMENT_AGENT_URL}"
    echo "Please start the agent with: npm run dev"
    exit 1
fi

echo "✅ Deployment Agent is running"

# Example 1: Deploy web application with automation
echo ""
echo "📦 Example 1: Deploying web application with automation workflows"
echo "================================================================="

DEPLOYMENT_PAYLOAD=$(cat <<EOF
{
  "projectName": "${PROJECT_NAME}",
  "environment": "${ENVIRONMENT}",
  "branch": "${BRANCH}",
  "commitSha": "${COMMIT_SHA}",
  "artifacts": [
    {
      "type": "web",
      "name": "frontend-app",
      "path": "./dist/frontend",
      "deploymentTarget": "vercel"
    },
    {
      "type": "automation",
      "name": "deployment-workflows",
      "path": "./workflows",
      "deploymentTarget": "n8n"
    }
  ],
  "workflowChecksPassed": true,
  "requestedBy": "example-script"
}
EOF
)

echo "🔄 Triggering deployment..."
DEPLOYMENT_RESPONSE=$(curl -s -X POST "${DEPLOYMENT_AGENT_URL}/deploy" \
    -H "Content-Type: application/json" \
    -d "${DEPLOYMENT_PAYLOAD}")

DEPLOYMENT_ID=$(echo "${DEPLOYMENT_RESPONSE}" | jq -r '.id // empty')

if [ -z "${DEPLOYMENT_ID}" ]; then
    echo "❌ Deployment failed to start"
    echo "Response: ${DEPLOYMENT_RESPONSE}"
    exit 1
fi

echo "✅ Deployment started with ID: ${DEPLOYMENT_ID}"
echo "Response: ${DEPLOYMENT_RESPONSE}" | jq '.'

# Example 2: Check deployment status
echo ""
echo "📊 Example 2: Checking deployment status"
echo "========================================"

echo "🔍 Checking deployment status..."
STATUS_RESPONSE=$(curl -s "${DEPLOYMENT_AGENT_URL}/deploy/${DEPLOYMENT_ID}")
echo "Status: $(echo "${STATUS_RESPONSE}" | jq -r '.status')"
echo "Full response:"
echo "${STATUS_RESPONSE}" | jq '.'

# Example 3: Simulate rollback
echo ""
echo "🔄 Example 3: Simulating rollback"
echo "================================="

echo "🧪 Simulating rollback..."
ROLLBACK_SIMULATION=$(curl -s -X POST "${DEPLOYMENT_AGENT_URL}/deploy/${DEPLOYMENT_ID}/simulate-rollback")
echo "Rollback simulation result:"
echo "${ROLLBACK_SIMULATION}" | jq '.'

# Example 4: List all deployments
echo ""
echo "📋 Example 4: Listing all active deployments"
echo "============================================"

echo "📝 Fetching deployment list..."
DEPLOYMENTS_LIST=$(curl -s "${DEPLOYMENT_AGENT_URL}/deployments")
echo "Active deployments:"
echo "${DEPLOYMENTS_LIST}" | jq '.'

# Example 5: Webhook simulation
echo ""
echo "🪝 Example 5: Workflow completion webhook simulation"
echo "==================================================="

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "projectName": "Webhook Triggered Project",
  "branch": "main",
  "commitSha": "webhook-commit-sha",
  "allPhasesComplete": true,
  "artifacts": [
    {
      "type": "web",
      "name": "webhook-app",
      "path": "./dist/webhook",
      "deploymentTarget": "vercel"
    }
  ]
}
EOF
)

echo "🔄 Simulating workflow completion webhook..."
WEBHOOK_RESPONSE=$(curl -s -X POST "${DEPLOYMENT_AGENT_URL}/webhook/workflow-complete" \
    -H "Content-Type: application/json" \
    -d "${WEBHOOK_PAYLOAD}")

echo "Webhook response:"
echo "${WEBHOOK_RESPONSE}" | jq '.'

echo ""
echo "🎉 Example deployment scenarios completed!"
echo "=========================================="
echo ""
echo "Key endpoints tested:"
echo "  ✅ POST /deploy - Trigger new deployment"
echo "  ✅ GET /deploy/{id} - Check deployment status" 
echo "  ✅ POST /deploy/{id}/simulate-rollback - Simulate rollback"
echo "  ✅ GET /deployments - List active deployments"
echo "  ✅ POST /webhook/workflow-complete - Workflow webhook"
echo ""
echo "For more information, see the DEPLOYMENT-AGENT.md documentation."