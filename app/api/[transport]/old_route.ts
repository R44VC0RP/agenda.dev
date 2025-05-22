import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos, comments, workspaces, workspaceMembers } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';


// Initialize the MCP request handler once at the module scope
const mcpRequestHandler = createMcpHandler(
  server => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {
    // Optional server options
  },
  {
    // Optional configuration
    // Explicitly set endpoints as if basePath: '/api' was used
    streamableHttpEndpoint: '/api/mcp',
    sseEndpoint: '/api/sse',
    maxDuration: 60,
    verboseLogs: true,
  }
);

const handlerWithAuth = async (request: Request) => {
  const session = await auth.api.getMcpSession({
    headers: request.headers
  });

  console.log('session', session);

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    });
  }

  // Delegate to the MCP request handler after successful authentication
  return mcpRequestHandler(request);
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export { handlerWithAuth as GET, handlerWithAuth as POST };