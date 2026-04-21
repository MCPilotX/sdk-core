import { Command } from 'commander';
import { getRegistryClient } from '@intentorch/core';
import { getToolRegistry } from '@intentorch/core';
import { getDisplayName } from '@intentorch/core';
import { toLightweightManifest, supportsDynamicDiscovery } from '@intentorch/core';

export function pullCommand(): Command {
  const command = new Command('pull')
    .description('Pull MCP Server configuration from Registry')
    .argument('<server>', `Server name or URL
      Examples:
        - Joooook/12306-mcp (GitHub repository)
        - mcp/12306 (official registry)
        - https://example.com/mcp.json (direct URL)
        - owner/repo@main (GitHub with branch)
        - owner/repo:dist/mcp.json (GitHub with custom path)
        - owner/repo@develop:src/mcp.json (GitHub with branch and custom path)`)
    .action(async (server: string) => {
      try {
        const registryClient = getRegistryClient();
        const displayName = getDisplayName(server);
        
        // Check if manifest is already cached
        let manifest: any;
        const cachedManifest = await registryClient.getCachedManifest(server);
        
        if (cachedManifest) {
          console.log(`ℹ️  Configuration for ${displayName} v${cachedManifest.version} is already cached`);
          manifest = cachedManifest;
        } else {
          manifest = await registryClient.fetchManifest(server);
          console.log(`✓ Pulled configuration for ${displayName} v${manifest.version}`);
        }
        
        console.log(`  Runtime: ${manifest.runtime.type}`);
        console.log(`  Command: ${manifest.runtime.command} ${manifest.runtime.args?.join(' ') || ''}`);
        
        if (manifest.runtime.env && manifest.runtime.env.length > 0) {
          console.log(`  Required environment variables: ${manifest.runtime.env.join(', ')}`);
        }
        
        // Check if this server supports dynamic tool discovery
        const supportsDynamic = supportsDynamicDiscovery(manifest);
        
        if (supportsDynamic) {
          console.log(`  Tool discovery: Will discover tools dynamically when server starts`);
          
          // Convert to lightweight manifest and cache it
          const lightweightManifest = toLightweightManifest(manifest);
          await registryClient.cacheManifest(server, lightweightManifest);
        } else {
          console.log(`  Tool discovery: Using static tool definitions from manifest`);
          
          // For backward compatibility, register tools from manifest
          const toolRegistry = getToolRegistry();
          await toolRegistry.registerToolsFromManifest(server, manifest);
          
          if (manifest.tools && manifest.tools.length > 0) {
            console.log(`  Tools: ${manifest.tools.length} tools registered (static)`);
            for (const tool of manifest.tools.slice(0, 3)) {
              console.log(`    - ${tool.name}: ${tool.description}`);
            }
            if (manifest.tools.length > 3) {
              console.log(`    ... and ${manifest.tools.length - 3} more`);
            }
          } else if (manifest.capabilities?.tools && manifest.capabilities.tools.length > 0) {
            console.log(`  Tools: ${manifest.capabilities.tools.length} tools registered (static)`);
            for (const tool of manifest.capabilities.tools.slice(0, 3)) {
              console.log(`    - ${tool.name}: ${tool.description}`);
            }
            if (manifest.capabilities.tools.length > 3) {
              console.log(`    ... and ${manifest.capabilities.tools.length - 3} more`);
            }
          } else {
            console.log(`  Tools: No tools declared in manifest`);
          }
        }
        
        console.log(`\n💡 Next steps:`);
        console.log(`   1. Set any required secrets: intorch secret set <name> <value>`);
        console.log(`   2. Start the server: intorch start ${displayName}`);
        
        if (supportsDynamic) {
          console.log(`   3. Tools will be automatically discovered after server starts`);
        }
      } catch (error) {
        console.error(`Failed to pull ${getDisplayName(server)}:`, (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
