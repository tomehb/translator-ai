#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

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

    try {
      // Build the command with provider and model options
      const provider = process.env.TRANSLATOR_PROVIDER || 'gemini';
      const geminiModel = process.env.GEMINI_MODEL ? `--gemini-model ${process.env.GEMINI_MODEL}` : '';
      const openaiModel = process.env.OPENAI_MODEL ? `--openai-model ${process.env.OPENAI_MODEL}` : '';
      const contextFlag = context ? `--context "${context.replace(/"/g, '\\"')}"` : '';
      const cmd = `translator-ai "${inputFile}" -l ${targetLanguage} -o "${outputFile}" --provider ${provider} ${geminiModel} ${openaiModel} ${contextFlag}`.trim();
      
      // Execute the command
      const { stdout, stderr } = await execAsync(cmd, {
        env: { ...process.env }
      });
      
      // Return success result
      return {
        content: [
          {
            type: "text",
            text: `Successfully translated ${inputFile} to ${targetLanguage}\nOutput saved to: ${outputFile}\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error translating file: ${error.message}\n${error.stderr || ''}`
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

    try {
      // Build the command with provider and model options
      const statsFlag = showStats ? "--stats" : "";
      const provider = process.env.TRANSLATOR_PROVIDER || 'gemini';
      const geminiModel = process.env.GEMINI_MODEL ? `--gemini-model ${process.env.GEMINI_MODEL}` : '';
      const openaiModel = process.env.OPENAI_MODEL ? `--openai-model ${process.env.OPENAI_MODEL}` : '';
      const contextFlag = context ? `--context "${context.replace(/"/g, '\\"')}"` : '';
      const cmd = `translator-ai ${pattern} -l ${targetLanguage} -o "${outputPattern}" ${statsFlag} --provider ${provider} ${geminiModel} ${openaiModel} ${contextFlag}`.trim();
      
      // Execute the command
      const { stdout, stderr } = await execAsync(cmd, {
        env: { ...process.env }
      });
      
      // Return success result
      return {
        content: [
          {
            type: "text",
            text: stdout
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error translating files: ${error.message}\n${error.stderr || ''}`
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