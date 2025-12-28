# translator-ai

[![CI](https://github.com/DatanoiseTV/translator-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/DatanoiseTV/translator-ai/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/translator-ai.svg)](https://www.npmjs.com/package/translator-ai)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat-square&logo=buy-me-a-coffee)](https://coff.ee/datanoisetv)

AI-powered JSON i18n translation with MCP (Model Context Protocol) integration. Translate your localization files using Google Gemini, OpenAI, or local Ollama models - directly from Claude Desktop, VS Code, or any MCP-compatible client.

## Key Features

- **MCP Integration**: Use as an MCP server with Claude Desktop, VS Code, Cursor, or any MCP client
- **Multi-Language Translation**: Translate to multiple languages in a single call (e.g., `es,fr,de,ja`)
- **Cultural Adaptation**: Provide custom context for culturally appropriate translations
- **Multiple AI Providers**: Google Gemini, OpenAI, or local Ollama/DeepSeek
- **Smart Caching**: Incremental caching - only translates new or modified strings
- **Deduplication**: Process multiple files with automatic deduplication to save API calls
- **Format Preservation**: Maintains URLs, emails, dates, numbers, and template variables unchanged

## Quick Start with MCP

### 1. Configure Your MCP Client

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "translator-ai": {
      "command": "npx",
      "args": ["-y", "translator-ai-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 2. Start Translating

Ask Claude to translate your files:

```
Translate locales/en.json to Spanish, French, and German
```

```
Translate my English locale file to Japanese with formal tone
```

```
Translate all JSON files in src/i18n to Latin American Spanish,
adapting idioms for the Mexican market
```

## MCP Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | (required for Gemini) |
| `OPENAI_API_KEY` | OpenAI API key | (required for OpenAI) |
| `TRANSLATOR_PROVIDER` | Provider: `gemini`, `openai`, or `ollama` | `gemini` |
| `GEMINI_MODEL` | Gemini model to use | `gemini-3-flash-preview` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |

### Provider Configurations

**Google Gemini (Recommended)**
```json
{
  "mcpServers": {
    "translator-ai": {
      "command": "npx",
      "args": ["-y", "translator-ai-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "TRANSLATOR_PROVIDER": "gemini",
        "GEMINI_MODEL": "gemini-3-flash-preview"
      }
    }
  }
}
```

**OpenAI**
```json
{
  "mcpServers": {
    "translator-ai": {
      "command": "npx",
      "args": ["-y", "translator-ai-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key",
        "TRANSLATOR_PROVIDER": "openai",
        "OPENAI_MODEL": "gpt-4o"
      }
    }
  }
}
```

**Local Ollama (Free)**
```json
{
  "mcpServers": {
    "translator-ai": {
      "command": "npx",
      "args": ["-y", "translator-ai-mcp"],
      "env": {
        "TRANSLATOR_PROVIDER": "ollama"
      }
    }
  }
}
```

## MCP Tools

### translate_json

Translate a single JSON file to one or more target languages.

**Parameters:**
- `inputFile` (required): Path to the source JSON file
- `targetLanguage` (required): Language code(s), comma-separated for multiple (e.g., `es,fr,de`)
- `outputFile` (required): Output path. Use `{lang}` placeholder for multi-language output
- `context` (optional): Custom translation instructions for cultural adaptation

**Examples:**

Single language:
```json
{
  "inputFile": "locales/en.json",
  "targetLanguage": "es",
  "outputFile": "locales/es.json"
}
```

Multiple languages with context:
```json
{
  "inputFile": "locales/en.json",
  "targetLanguage": "es,fr,de,ja",
  "outputFile": "locales/{lang}.json",
  "context": "Use formal tone. Target audience: business professionals."
}
```

Cultural adaptation:
```json
{
  "inputFile": "app/en.json",
  "targetLanguage": "es",
  "outputFile": "app/es-mx.json",
  "context": "Adapt for Mexican Spanish. Use local idioms and expressions. Informal tone for younger audience."
}
```

### translate_multiple

Translate multiple JSON files with automatic deduplication to save API calls.

**Parameters:**
- `pattern` (required): File pattern or glob (e.g., `locales/en/*.json`)
- `targetLanguage` (required): Language code(s), comma-separated
- `outputPattern` (required): Output pattern with `{dir}`, `{name}`, `{lang}` variables
- `showStats` (optional): Show deduplication statistics
- `context` (optional): Custom translation instructions

**Examples:**

Multiple files to multiple languages:
```json
{
  "pattern": "src/i18n/en/*.json",
  "targetLanguage": "es,fr,de",
  "outputPattern": "src/i18n/{lang}/{name}.json",
  "showStats": true
}
```

With cultural context:
```json
{
  "pattern": "locales/en/*.json",
  "targetLanguage": "zh-TW",
  "outputPattern": "locales/zh-TW/{name}.json",
  "context": "Traditional Chinese for Taiwan market. Use polite honorifics."
}
```

## Cultural Adaptation Examples

The `context` parameter allows you to customize translations for specific audiences:

**Regional Variants:**
- `"Use Latin American Spanish, not Castilian"`
- `"British English spelling and expressions"`
- `"Brazilian Portuguese, informal tone"`

**Tone and Style:**
- `"Formal business language"`
- `"Casual, friendly tone for a mobile app"`
- `"Technical documentation style"`

**Audience-Specific:**
- `"Target audience: children ages 6-12"`
- `"Medical professionals - use clinical terminology"`
- `"Gaming community - use gamer slang where appropriate"`

**Cultural Sensitivity:**
- `"Adapt idioms and metaphors for Japanese culture"`
- `"Avoid expressions that don't translate well to German"`
- `"Use gender-neutral language where possible"`

## Available Models

### Gemini Models
- `gemini-3-flash-preview` (default) - Latest, excellent quality/speed balance
- `gemini-3-pro-preview` - Most capable for complex translations
- `gemini-2.5-flash` - Fast with strong reasoning
- `gemini-2.0-flash-lite` - Fastest, most cost-effective

### OpenAI Models
- `gpt-4o-mini` (default) - Cost-effective, fast
- `gpt-4o` - Most capable
- `gpt-4-turbo` - Previous flagship
- `gpt-3.5-turbo` - Fast for simple translations

### Ollama Models
- `deepseek-r1:latest` (default) - Good reasoning capabilities
- Any model available in your local Ollama installation

---

## CLI Usage

For users who prefer command-line usage, translator-ai also works as a standalone CLI tool.

### Installation

```bash
npm install -g translator-ai
```

### Configuration

Set your API key:
```bash
export GEMINI_API_KEY=your-api-key-here
# or
export OPENAI_API_KEY=your-api-key-here
```

### Basic Commands

```bash
# Translate a single file
translator-ai en.json -l es -o es.json

# Translate to multiple languages
translator-ai en.json -l es,fr,de,ja -o translations/{lang}.json

# Translate with cultural context
translator-ai en.json -l es -o es-mx.json --context "Mexican Spanish, informal tone"

# Translate multiple files with deduplication
translator-ai src/locales/en/*.json -l es -o "src/locales/es/{name}.json" --stats

# Use a specific provider
translator-ai en.json -l es -o es.json --provider openai --openai-model gpt-4o

# Dry run - preview without making API calls
translator-ai en.json -l es -o es.json --dry-run
```

### CLI Options

```
translator-ai <inputFiles...> [options]

Arguments:
  inputFiles                   Path(s) to source JSON file(s) or glob patterns

Options:
  -l, --lang <langCodes>      Target language code(s), comma-separated
  -o, --output <pattern>      Output file path or pattern
  --context <instructions>    Custom translation context or instructions
  --stdout                    Output to stdout instead of file
  --stats                     Show detailed performance statistics
  --no-cache                  Disable translation cache
  --cache-file <path>         Custom cache file path
  --provider <type>           Provider: gemini, openai, or ollama (default: gemini)
  --gemini-model <model>      Gemini model (default: gemini-3-flash-preview)
  --openai-model <model>      OpenAI model (default: gpt-4o-mini)
  --ollama-url <url>          Ollama API URL (default: http://localhost:11434)
  --ollama-model <model>      Ollama model (default: deepseek-r1:latest)
  --detect-source             Auto-detect source language
  --dry-run                   Preview without making API calls
  --preserve-formats          Preserve URLs, emails, dates, numbers
  --metadata                  Add translation metadata to output
  --sort-keys                 Sort output JSON keys alphabetically
  --check-keys                Verify all source keys exist in output
  --verbose                   Enable verbose output
  --list-providers            List available providers
  -h, --help                  Display help
  -V, --version               Display version

Output Pattern Variables:
  {dir}   - Original directory path
  {name}  - Original filename without extension
  {lang}  - Target language code
```

## How It Works

1. **Parse**: Reads and flattens JSON structure into paths
2. **Deduplicate**: Identifies shared strings across files
3. **Cache Check**: Loads previously translated strings
4. **Batch**: Groups unique strings for optimal API efficiency
5. **Translate**: Sends batches to AI provider with context
6. **Reconstruct**: Rebuilds exact JSON structure with translations
7. **Cache Update**: Stores new translations for future use

## Cache Management

### Default Cache Locations
- **Windows**: `%APPDATA%\translator-ai\translation-cache.json`
- **macOS**: `~/Library/Caches/translator-ai/translation-cache.json`
- **Linux**: `~/.cache/translator-ai/translation-cache.json`

The cache stores translations indexed by source file, target language, and content hash - ensuring modified strings are retranslated while unchanged strings use cached translations.

## Provider Comparison

| Provider | Speed | Cost | Privacy | Best For |
|----------|-------|------|---------|----------|
| Gemini | Fast | Low | Cloud | Production, large projects |
| OpenAI | Fast | Medium | Cloud | Complex translations |
| Ollama | Slower | Free | Local | Privacy-sensitive, development |

## Development

```bash
git clone https://github.com/DatanoiseTV/translator-ai.git
cd translator-ai
npm install
npm run build
npm start -- test.json -l es -o output.json
```

## License

This project requires attribution for both commercial and non-commercial use. See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/DatanoiseTV/translator-ai/issues).

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat-square&logo=buy-me-a-coffee)](https://coff.ee/datanoisetv)
