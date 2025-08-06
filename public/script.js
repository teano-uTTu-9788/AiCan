// Web Development Agent Dashboard Script

class WebDevAgent {
    constructor() {
        this.statusEndpoint = '/api/status';
        this.init();
    }

    async init() {
        await this.updateStatus();
        this.startStatusPolling();
        this.bindEvents();
    }

    async updateStatus() {
        try {
            const response = await fetch(this.statusEndpoint);
            const data = await response.json();
            
            this.updateStatusDisplay(data);
        } catch (error) {
            console.error('Failed to fetch status:', error);
            this.showErrorStatus();
        }
    }

    updateStatusDisplay(data) {
        const elements = {
            'build-status': data.build === 'success' ? '✅ Passing' : '❌ Failed',
            'deploy-status': data.deployment === 'ready' ? '🚀 Ready' : '⏳ Pending',
            'coverage-status': `📊 ${data.coverage}`,
            'last-update': `⏱️ ${this.formatTime(data.lastUpdate)}`
        };

        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
                this.updateStatusClass(element, data.build);
            }
        });
    }

    updateStatusClass(element, buildStatus) {
        element.className = 'status-badge';
        if (buildStatus === 'success') {
            element.classList.add('success');
        } else {
            element.classList.add('error');
        }
    }

    showErrorStatus() {
        const statusElements = ['build-status', 'deploy-status', 'coverage-status'];
        statusElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '❌ Error';
                element.className = 'status-badge error';
            }
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }

    startStatusPolling() {
        // Poll for status updates every 30 seconds
        setInterval(() => {
            this.updateStatus();
        }, 30000);
    }

    bindEvents() {
        // Add click handlers for status items to show more details
        document.querySelectorAll('.status-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showStatusDetails(item);
            });
        });
    }

    showStatusDetails(item) {
        const title = item.querySelector('h3').textContent;
        console.log(`Showing details for: ${title}`);
        // In a real implementation, this would show a modal or redirect to details page
    }
}

// Initialize the Web Development Agent when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebDevAgent();
});

// Add some visual feedback for integration items
document.addEventListener('DOMContentLoaded', () => {
    const integrationItems = document.querySelectorAll('.integration-item');
    
    integrationItems.forEach((item, index) => {
        // Add staggered animation
        item.style.animationDelay = `${index * 0.1}s`;
        item.style.animation = 'fadeInUp 0.6s ease forwards';
    });
});

// Add CSS animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .status-badge.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
`;
document.head.appendChild(style);