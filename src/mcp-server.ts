#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

// Input validation to prevent path traversal and injection attacks
function validateFilePath(filePath: string): string {
  // Normalize the path to resolve .. and . segments
  const normalized = path.normalize(filePath);

  // Check for null bytes (injection attempt)
  if (normalized.includes('\0')) {
    throw new Error('Invalid file path: contains null bytes');
  }

  // Check for shell metacharacters that shouldn't be in file paths
  const dangerousChars = /[;&|`$(){}[\]<>!]/;
  if (dangerousChars.test(normalized)) {
    throw new Error('Invalid file path: contains shell metacharacters');
  }

  return normalized;
}

function validateLanguageCode(lang: string): string {
  // Language codes should be alphanumeric with optional hyphens (e.g., "en", "zh-TW", "pt-BR")
  // Allow comma-separated for multiple languages
  const validLangPattern = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?(,[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?)*$/;
  if (!validLangPattern.test(lang)) {
    throw new Error(`Invalid language code: ${lang}. Expected format: "es" or "es,fr,de"`);
  }
  return lang;
}

function validateContext(context: string | undefined): string | undefined {
  if (!context) return undefined;

  // Limit context length to prevent abuse
  if (context.length > 1000) {
    throw new Error('Context too long: maximum 1000 characters');
  }

  return context;
}

// Helper to get current provider and model configuration
function getProviderInfo(): { provider: string; model: string } {
  const provider = process.env.TRANSLATOR_PROVIDER || 'gemini';
  let model: string;

  switch (provider) {
    case 'openai':
      model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      break;
    case 'ollama':
      model = process.env.OLLAMA_MODEL || 'deepseek-r1:latest';
      break;
    case 'gemini':
    default:
      model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
      break;
  }

  return { provider, model };
}

const server = new Server(
  {
    name: "translator-ai",
    version: "1.0.5",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "translate_json") {
    const { inputFile, targetLanguage, outputFile, context } = args as {
      inputFile: string;
      targetLanguage: string;
      outputFile: string;
      context?: string;
    };

    const { provider, model } = getProviderInfo();

    try {
      // Validate inputs to prevent injection attacks
      const safeInputFile = validateFilePath(inputFile);
      const safeOutputFile = validateFilePath(outputFile);
      const safeTargetLang = validateLanguageCode(targetLanguage);
      const safeContext = validateContext(context);

      // Build argument array (safe from shell injection)
      const cmdArgs: string[] = [
        safeInputFile,
        '-l', safeTargetLang,
        '-o', safeOutputFile,
        '--provider', provider
      ];

      if (process.env.GEMINI_MODEL) {
        cmdArgs.push('--gemini-model', process.env.GEMINI_MODEL);
      }
      if (process.env.OPENAI_MODEL) {
        cmdArgs.push('--openai-model', process.env.OPENAI_MODEL);
      }
      if (safeContext) {
        cmdArgs.push('--context', safeContext);
      }

      // Execute with execFile (safe from shell injection)
      const { stdout, stderr } = await execFileAsync('translator-ai', cmdArgs, {
        env: { ...process.env }
      });

      // Return success result with provider info
      return {
        content: [
          {
            type: "text",
            text: `✅ Successfully translated ${inputFile} to ${targetLanguage}\n📁 Output saved to: ${outputFile}\n🤖 Provider: ${provider} | Model: ${model}\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error translating file: ${error.message}\n🤖 Provider: ${provider} | Model: ${model}\n${error.stderr || ''}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "translate_multiple") {
    const { pattern, targetLanguage, outputPattern, showStats = false, context } = args as {
      pattern: string;
      targetLanguage: string;
      outputPattern: string;
      showStats?: boolean;
      context?: string;
    };

    const { provider, model } = getProviderInfo();

    try {
      // Validate inputs
      const safePattern = validateFilePath(pattern);
      const safeTargetLang = validateLanguageCode(targetLanguage);
      const safeOutputPattern = validateFilePath(outputPattern);
      const safeContext = validateContext(context);

      // Build argument array (safe from shell injection)
      const cmdArgs: string[] = [
        safePattern,
        '-l', safeTargetLang,
        '-o', safeOutputPattern,
        '--provider', provider
      ];

      if (showStats) {
        cmdArgs.push('--stats');
      }
      if (process.env.GEMINI_MODEL) {
        cmdArgs.push('--gemini-model', process.env.GEMINI_MODEL);
      }
      if (process.env.OPENAI_MODEL) {
        cmdArgs.push('--openai-model', process.env.OPENAI_MODEL);
      }
      if (safeContext) {
        cmdArgs.push('--context', safeContext);
      }

      // Execute with execFile (safe from shell injection)
      const { stdout, stderr } = await execFileAsync('translator-ai', cmdArgs, {
        env: { ...process.env }
      });

      // Return success result with provider info
      return {
        content: [
          {
            type: "text",
            text: `🤖 Provider: ${provider} | Model: ${model}\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error translating files: ${error.message}\n🤖 Provider: ${provider} | Model: ${model}\n${error.stderr || ''}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "detect_language") {
    const { inputFile } = args as {
      inputFile: string;
    };

    const { provider, model } = getProviderInfo();

    try {
      // Validate input
      const safeInputFile = validateFilePath(inputFile);

      // Build argument array (safe from shell injection)
      const cmdArgs: string[] = [
        safeInputFile,
        '-l', 'en',
        '-o', '/dev/null',
        '--detect-source',
        '--dry-run',
        '--provider', provider
      ];

      if (process.env.GEMINI_MODEL) {
        cmdArgs.push('--gemini-model', process.env.GEMINI_MODEL);
      }
      if (process.env.OPENAI_MODEL) {
        cmdArgs.push('--openai-model', process.env.OPENAI_MODEL);
      }

      // Execute with execFile (safe from shell injection)
      const { stdout, stderr } = await execFileAsync('translator-ai', cmdArgs, {
        env: { ...process.env }
      });

      // Parse the detected language from output
      const output = stdout + stderr;
      const langMatch = output.match(/Detected source language:\s*(.+)/i) ||
                        output.match(/Source language:\s*(.+)/i);
      const detectedLang = langMatch ? langMatch[1].trim() : 'Unknown';

      return {
        content: [
          {
            type: "text",
            text: `🌐 Detected language: ${detectedLang}\n🤖 Provider: ${provider} | Model: ${model}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error detecting language: ${error.message}\n🤖 Provider: ${provider} | Model: ${model}\n${error.stderr || ''}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "validate_translation") {
    const { sourceFile, translatedFile } = args as {
      sourceFile: string;
      translatedFile: string;
    };

    try {
      // Validate file paths
      const safeSourceFile = validateFilePath(sourceFile);
      const safeTranslatedFile = validateFilePath(translatedFile);

      // Read both files and compare keys
      const { promises: fs } = await import('fs');

      const sourceContent = await fs.readFile(safeSourceFile, 'utf-8');
      const translatedContent = await fs.readFile(safeTranslatedFile, 'utf-8');

      const sourceJson = JSON.parse(sourceContent);
      const translatedJson = JSON.parse(translatedContent);

      // Flatten and compare keys
      const getKeys = (obj: any, prefix = ''): string[] => {
        const keys: string[] = [];
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys.push(...getKeys(obj[key], fullKey));
          } else {
            keys.push(fullKey);
          }
        }
        return keys;
      };

      const sourceKeys = new Set(getKeys(sourceJson));
      const translatedKeys = new Set(getKeys(translatedJson));

      const missingKeys = [...sourceKeys].filter(k => !translatedKeys.has(k) && !k.startsWith('_translator_metadata'));
      const extraKeys = [...translatedKeys].filter(k => !sourceKeys.has(k) && !k.startsWith('_translator_metadata'));

      const isValid = missingKeys.length === 0;

      let result = `Validation ${isValid ? 'PASSED ✓' : 'FAILED ✗'}\n`;
      result += `Source keys: ${sourceKeys.size}\n`;
      result += `Translated keys: ${translatedKeys.size}\n`;

      if (missingKeys.length > 0) {
        result += `\nMissing keys (${missingKeys.length}):\n${missingKeys.map(k => `  - ${k}`).join('\n')}`;
      }
      if (extraKeys.length > 0) {
        result += `\nExtra keys (${extraKeys.length}):\n${extraKeys.map(k => `  + ${k}`).join('\n')}`;
      }

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error validating translation: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "translate_string") {
    const { text, targetLanguage, context } = args as {
      text: string;
      targetLanguage: string;
      context?: string;
    };

    const { provider, model } = getProviderInfo();

    try {
      // Validate inputs
      const safeTargetLang = validateLanguageCode(targetLanguage);
      const safeContext = validateContext(context);

      // Validate text length
      if (!text || text.length === 0) {
        throw new Error('Text to translate cannot be empty');
      }
      if (text.length > 10000) {
        throw new Error('Text too long: maximum 10000 characters');
      }

      const { promises: fs } = await import('fs');
      const os = await import('os');
      const pathModule = await import('path');

      // Create temporary files
      const tempDir = os.tmpdir();
      const tempInput = pathModule.join(tempDir, `translator-ai-input-${Date.now()}.json`);
      const tempOutput = pathModule.join(tempDir, `translator-ai-output-${Date.now()}.json`);

      // Write input as JSON
      await fs.writeFile(tempInput, JSON.stringify({ text }), 'utf-8');

      // Build argument array (safe from shell injection)
      const cmdArgs: string[] = [
        tempInput,
        '-l', safeTargetLang,
        '-o', tempOutput,
        '--provider', provider
      ];

      if (process.env.GEMINI_MODEL) {
        cmdArgs.push('--gemini-model', process.env.GEMINI_MODEL);
      }
      if (process.env.OPENAI_MODEL) {
        cmdArgs.push('--openai-model', process.env.OPENAI_MODEL);
      }
      if (safeContext) {
        cmdArgs.push('--context', safeContext);
      }

      // Execute with execFile (safe from shell injection)
      await execFileAsync('translator-ai', cmdArgs, { env: { ...process.env } });

      // Read result
      const resultContent = await fs.readFile(tempOutput, 'utf-8');
      const resultJson = JSON.parse(resultContent);

      // Cleanup with proper error logging
      await fs.unlink(tempInput).catch((e) => console.error('Failed to cleanup temp input:', e.message));
      await fs.unlink(tempOutput).catch((e) => console.error('Failed to cleanup temp output:', e.message));

      const translatedText = resultJson.text || resultJson;
      return {
        content: [
          {
            type: "text",
            text: `${translatedText}\n\n🤖 Provider: ${provider} | Model: ${model}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error translating string: ${error.message}\n🤖 Provider: ${provider} | Model: ${model}\n${error.stderr || ''}`
          }
        ],
        isError: true
      };
    }
  }

  // Unknown tool
  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`
      }
    ],
    isError: true
  };
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "translate_json",
        description: "Translate a JSON i18n file to target language(s) with AI-powered translation. Supports multiple languages in a single call (comma-separated), custom context for cultural adaptation, and multiple AI providers.",
        inputSchema: {
          type: "object",
          properties: {
            inputFile: {
              type: "string",
              description: "Path to the source JSON file to translate"
            },
            targetLanguage: {
              type: "string",
              description: "Target language code(s). Use comma-separated values for multiple languages (e.g., 'es,fr,de' to translate to Spanish, French, and German in one call)"
            },
            outputFile: {
              type: "string",
              description: "Path where the translated file should be saved. Use {lang} placeholder for multi-language output (e.g., 'locales/{lang}.json')"
            },
            context: {
              type: "string",
              description: "Custom translation context or instructions for cultural adaptation (e.g., 'Use Latin American Spanish, formal tone' or 'Adapt idioms for British English audience')"
            }
          },
          required: ["inputFile", "targetLanguage", "outputFile"]
        }
      },
      {
        name: "translate_multiple",
        description: "Translate multiple JSON files with automatic deduplication to save API calls. Supports multiple target languages and custom context for cultural adaptation.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "File pattern or multiple files (e.g., 'locales/en/*.json' or 'file1.json file2.json')"
            },
            targetLanguage: {
              type: "string",
              description: "Target language code(s). Use comma-separated values for multiple languages (e.g., 'es,fr,de')"
            },
            outputPattern: {
              type: "string",
              description: "Output pattern with variables: {dir} for directory, {name} for filename, {lang} for language"
            },
            showStats: {
              type: "boolean",
              description: "Show deduplication statistics and API call savings",
              default: false
            },
            context: {
              type: "string",
              description: "Custom translation context or instructions for cultural adaptation (e.g., 'Use formal tone throughout' or 'Target audience: medical professionals')"
            }
          },
          required: ["pattern", "targetLanguage", "outputPattern"]
        }
      },
      {
        name: "detect_language",
        description: "Detect the language of a JSON i18n file. Useful for verifying source language before translation or for unknown files.",
        inputSchema: {
          type: "object",
          properties: {
            inputFile: {
              type: "string",
              description: "Path to the JSON file to analyze"
            }
          },
          required: ["inputFile"]
        }
      },
      {
        name: "validate_translation",
        description: "Validate that a translated file contains all keys from the source file. Useful for CI/CD pipelines to ensure translation completeness.",
        inputSchema: {
          type: "object",
          properties: {
            sourceFile: {
              type: "string",
              description: "Path to the original source JSON file"
            },
            translatedFile: {
              type: "string",
              description: "Path to the translated JSON file to validate"
            }
          },
          required: ["sourceFile", "translatedFile"]
        }
      },
      {
        name: "translate_string",
        description: "Translate a single text string. Useful for ad-hoc translations or dynamic content that isn't in a JSON file.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text string to translate"
            },
            targetLanguage: {
              type: "string",
              description: "Target language code (e.g., 'es', 'fr', 'de', 'ja')"
            },
            context: {
              type: "string",
              description: "Optional translation context (e.g., 'Formal business email' or 'Casual chat message')"
            }
          },
          required: ["text", "targetLanguage"]
        }
      }
    ]
  };
});

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP communication
  console.error("translator-ai MCP server running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});