# Content & Research Agent

A comprehensive AI-powered agent system that sources data from multiple AI services (Grok, Gemini, Perplexity), processes it for content creation (Claude, GPT-4o/o3-pro), and integrates with media generation services (ElevenLabs, Synthesia) and storage platforms (Notion).

## Features

- **Multi-source Research**: Automatically gathers information from Perplexity Pro, Gemini, and Grok
- **AI Content Generation**: Creates drafts using Claude and GPT-4o
- **Text-to-Speech**: Converts content to audio using ElevenLabs
- **Video Generation**: Creates videos using Synthesia
- **Notion Integration**: Organizes all research and content in Notion
- **Quality Assurance**: Built-in citation checking and fact validation
- **CLI Interface**: Easy-to-use command line interface

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/teano-uTTu-9788/AiCan.git
cd AiCan

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required API keys:
- OpenAI API key (for GPT-4o)
- Anthropic API key (for Claude)
- Google API key (for Gemini)
- Perplexity API key
- ElevenLabs API key
- Synthesia API key
- Notion integration token

### 3. Basic Usage

#### Research a Topic
```bash
python cli.py research "artificial intelligence trends 2024"
```

#### Create Content
```bash
python cli.py create "artificial intelligence trends 2024" --type article
```

#### Generate Speech
```bash
python cli.py speech "Your text content here" --voice rachel
```

#### Generate Video
```bash
python cli.py video "Your script content here" --avatar anna
```

#### Complete Workflow
```bash
python cli.py workflow "artificial intelligence trends 2024" --include-speech --include-video
```

## Agent Specification

### Example: New Topic Research
**Input**: "Start fact-gathering for product X."

**Output**:
- Query via Perplexity Pro/Gemini
- Summarize with Claude
- Organize results in Notion

### Standards and Guidelines
- Always cite facts
- Avoid repetition in content
- Validate all sources
- Spot-check with Tu orchestrator

### Dependencies
- Grok, Gemini, Perplexity (research)
- Claude, GPT-4o (content generation)
- Notion (organization)
- ElevenLabs (text-to-speech)
- Synthesia (video generation)

## API Reference

### ContentResearchAgent Class

```python
from content_research_agent import ContentResearchAgent

# Initialize agent
agent = ContentResearchAgent()

# Research a topic
result = agent.research_topic("your topic here")

# Create content draft
draft = agent.create_content_draft("your topic", "article")

# Generate speech
audio = agent.generate_speech("your text here")

# Generate video
video = agent.generate_video("your script here")
```

### CLI Commands

```bash
# Research commands
python cli.py research <topic> [--sources all|perplexity|gemini|grok]

# Content creation
python cli.py create <topic> [--type article|blog|script] [--agent-type claude|gpt4o]

# Media generation
python cli.py speech <text> [--voice <voice_id>] [--output <file>]
python cli.py video <script> [--avatar <avatar_id>] [--output <file>]

# Workflows
python cli.py workflow <topic> [--content-type <type>] [--include-speech] [--include-video]

# Status
python cli.py status
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### YAML Configuration

The `config.yaml` file contains detailed configuration for:
- Research sources settings
- Content generation parameters
- Media generation options
- Storage configuration
- Quality assurance settings
- Workflow definitions

## Quality Assurance

The agent includes built-in quality assurance features:

- **Citation Validation**: All facts must be properly cited
- **Source Verification**: Multiple sources are cross-referenced
- **Duplicate Detection**: Prevents repetitive content
- **Tu Orchestrator Integration**: External validation system

## Examples

### Research Example

```python
# Research AI trends
agent = ContentResearchAgent()
result = agent.research_topic("AI automation in healthcare 2024")

print(f"Summary: {result['summary']}")
print(f"Sources: {len(result['research_results'])}")
print(f"Notion URL: {result['notion_url']}")
```

### Content Creation Example

```python
# Create an article about the research
draft = agent.create_content_draft("AI automation in healthcare 2024", "article")

print(f"Title: {draft.title}")
print(f"Content length: {len(draft.content)} characters")
print(f"Sources used: {len(draft.source_material)}")
```

### Media Generation Example

```python
# Generate speech from content
speech_result = agent.generate_speech(draft.content[:500])
print(f"Audio file: {speech_result['audio_path']}")

# Generate video from script
video_result = agent.generate_video(draft.content[:200])
print(f"Video file: {video_result['video_path']}")
```

## Troubleshooting

### Common Issues

1. **Missing API Keys**: Ensure all required API keys are set in your `.env` file
2. **Rate Limits**: Some AI services have rate limits; the agent includes retry logic
3. **Large Content**: Content is automatically chunked for media generation
4. **Notion Setup**: Ensure your Notion integration has proper permissions

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

agent = ContentResearchAgent()
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

See LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the configuration examples