#!/usr/bin/env python3
"""
Command Line Interface for Content & Research Agent

Provides easy access to agent functionality through CLI commands.
"""

import click
import os
import sys
from pathlib import Path

# Add the current directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from content_research_agent import ContentResearchAgent


@click.group()
@click.option('--config', '-c', help='Configuration file path')
@click.pass_context
def cli(ctx, config):
    """Content & Research Agent CLI - AI-powered research and content creation."""
    ctx.ensure_object(dict)
    ctx.obj['config'] = config
    ctx.obj['agent'] = ContentResearchAgent()


@cli.command()
@click.argument('topic')
@click.option('--sources', '-s', default='all', help='Research sources to use (all, perplexity, gemini, grok)')
@click.pass_context
def research(ctx, topic, sources):
    """Start fact-gathering for a given topic."""
    click.echo(f"🔍 Starting research for: {topic}")
    
    agent = ctx.obj['agent']
    result = agent.research_topic(topic)
    
    click.echo(f"✅ Research completed!")
    click.echo(f"📝 Summary: {result['summary'][:200]}...")
    
    if result.get('notion_url'):
        click.echo(f"📋 Notion page: {result['notion_url']}")
    
    click.echo(f"🕒 Completed at: {result['timestamp']}")


@cli.command()
@click.argument('topic')
@click.option('--type', '-t', default='article', help='Content type (article, blog, script, etc.)')
@click.option('--agent-type', '-a', default='claude', help='AI agent to use (claude, gpt4o)')
@click.pass_context
def create(ctx, topic, type, agent_type):
    """Create content draft based on research."""
    click.echo(f"✍️ Creating {type} for: {topic}")
    
    agent = ctx.obj['agent']
    draft = agent.create_content_draft(topic, type)
    
    if draft:
        click.echo(f"✅ Content draft created!")
        click.echo(f"📝 Title: {draft.title}")
        click.echo(f"📊 Based on {len(draft.source_material)} research sources")
        click.echo(f"🤖 Author: {draft.author_agent}")
        click.echo(f"📄 Preview: {draft.content[:200]}...")
    else:
        click.echo("❌ Failed to create content draft. Check if research exists for this topic.")


@cli.command()
@click.argument('text')
@click.option('--voice', '-v', help='Voice ID for ElevenLabs')
@click.option('--output', '-o', help='Output file path')
@click.pass_context
def speech(ctx, text, voice, output):
    """Generate text-to-speech using ElevenLabs."""
    click.echo(f"🎤 Generating speech for text (length: {len(text)} chars)")
    
    agent = ctx.obj['agent']
    result = agent.generate_speech(text, voice)
    
    click.echo(f"✅ Speech generated!")
    click.echo(f"🎵 Audio file: {result['audio_path']}")
    click.echo(f"⏱️ Duration: {result['duration']:.1f} seconds")


@cli.command()
@click.argument('script')
@click.option('--avatar', '-a', help='Avatar ID for Synthesia')
@click.option('--output', '-o', help='Output file path')
@click.pass_context
def video(ctx, script, avatar, output):
    """Generate video using Synthesia."""
    click.echo(f"🎬 Generating video for script (length: {len(script)} chars)")
    
    agent = ctx.obj['agent']
    result = agent.generate_video(script, avatar)
    
    click.echo(f"✅ Video generated!")
    click.echo(f"📹 Video file: {result['video_path']}")
    click.echo(f"⏱️ Duration: {result['duration']:.1f} seconds")


@cli.command()
@click.argument('topic')
@click.option('--content-type', '-t', default='article', help='Content type')
@click.option('--include-speech', '-s', is_flag=True, help='Generate speech')
@click.option('--include-video', '-v', is_flag=True, help='Generate video')
@click.pass_context
def workflow(ctx, topic, content_type, include_speech, include_video):
    """Run complete workflow: research → content → media."""
    click.echo(f"🚀 Starting complete workflow for: {topic}")
    
    agent = ctx.obj['agent']
    
    # Step 1: Research
    click.echo("🔍 Step 1: Researching topic...")
    research_result = agent.research_topic(topic)
    click.echo(f"✅ Research completed")
    
    # Step 2: Create content
    click.echo("✍️ Step 2: Creating content...")
    draft = agent.create_content_draft(topic, content_type)
    if not draft:
        click.echo("❌ Failed to create content. Stopping workflow.")
        return
    click.echo(f"✅ Content created: {draft.title}")
    
    # Step 3: Generate speech (optional)
    if include_speech:
        click.echo("🎤 Step 3: Generating speech...")
        speech_result = agent.generate_speech(draft.content[:1000])  # First 1000 chars
        click.echo(f"✅ Speech generated: {speech_result['audio_path']}")
    
    # Step 4: Generate video (optional)
    if include_video:
        click.echo("🎬 Step 4: Generating video...")
        video_result = agent.generate_video(draft.content[:500])  # First 500 chars as script
        click.echo(f"✅ Video generated: {video_result['video_path']}")
    
    click.echo("🎉 Workflow completed successfully!")


@cli.command()
@click.pass_context
def status(ctx):
    """Show agent status and configuration."""
    click.echo("📊 Content & Research Agent Status")
    click.echo("=" * 40)
    
    agent = ctx.obj['agent']
    
    click.echo(f"🔬 Research results stored: {len(agent.research_results)}")
    click.echo(f"📝 Content drafts created: {len(agent.content_drafts)}")
    
    # Check environment variables
    click.echo("\n🔑 API Key Status:")
    keys_to_check = [
        'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
        'PERPLEXITY_API_KEY', 'ELEVENLABS_API_KEY', 'NOTION_TOKEN'
    ]
    
    for key in keys_to_check:
        status = "✅ Set" if os.getenv(key) else "❌ Missing"
        click.echo(f"  {key}: {status}")


if __name__ == '__main__':
    cli()