#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

class TwentyiMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "20i-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiKey = process.env.TWENTYI_API_KEY;
    this.baseURL = "https://api.20i.com";

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_domains",
          description: "List all domains in your 20i account",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_domain_info",
          description: "Get detailed information about a specific domain",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "The domain name to get info for",
              },
            },
            required: ["domain"],
          },
        },
        {
          name: "list_packages",
          description: "List all hosting packages",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_domains":
            return await this.listDomains();
          case "get_domain_info":
            return await this.getDomainInfo(args.domain);
          case "list_packages":
            return await this.listPackages();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async makeAPICall(endpoint, method = "GET", data = null) {
    if (!this.apiKey) {
      throw new Error("20i API key not configured");
    }

    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  async listDomains() {
    const domains = await this.makeAPICall("/domain");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(domains, null, 2),
        },
      ],
    };
  }

  async getDomainInfo(domain) {
    const domainInfo = await this.makeAPICall(`/domain/${domain}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(domainInfo, null, 2),
        },
      ],
    };
  }

  async listPackages() {
    const packages = await this.makeAPICall("/package");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(packages, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("20i MCP server running on stdio");
  }
}

const server = new TwentyiMCPServer();
server.run().catch(console.error);
