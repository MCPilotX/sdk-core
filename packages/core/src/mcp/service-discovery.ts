/**
 * MCP Service Discovery and Registration System
 * Enhanced service discovery mechanism for MCP service management tools integration
 */

import { EventEmitter } from 'events';
import { TransportConfig } from './types';

export interface MCPServiceInfo {
  id: string;
  name: string;
  version?: string;
  description?: string;
  transport: TransportConfig;
  metadata: {
    discoveredAt: number;
    lastSeen: number;
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
    capabilities: string[];
    tags: string[];
  };
}

export interface ServiceDiscoveryOptions {
  scanInterval?: number; // milliseconds
  healthCheckInterval?: number;
  autoRegister?: boolean;
  discoverySources?: Array<'local' | 'network' | 'registry'>;
}

export interface ServiceRegistry {
  register(service: MCPServiceInfo): Promise<void>;
  unregister(serviceId: string): Promise<void>;
  discover(filter?: ServiceFilter): Promise<MCPServiceInfo[]>;
  get(serviceId: string): Promise<MCPServiceInfo | null>;
  updateHealth(serviceId: string, status: 'healthy' | 'unhealthy'): Promise<void>;
}

export interface ServiceFilter {
  name?: string;
  tags?: string[];
  capabilities?: string[];
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

/**
 * Enhanced Service Discovery Manager
 * Supports multiple discovery sources and automatic health monitoring
 */
export class ServiceDiscoveryManager extends EventEmitter {
  private services: Map<string, MCPServiceInfo> = new Map();
  private options: ServiceDiscoveryOptions;
  private scanInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(options: ServiceDiscoveryOptions = {}) {
    super();
    this.options = {
      scanInterval: 30000, // 30 seconds
      healthCheckInterval: 60000, // 1 minute
      autoRegister: true,
      discoverySources: ['local'],
      ...options,
    };
  }

  /**
   * Start service discovery
   */
  async start(): Promise<void> {
    console.log('Starting MCP service discovery...');

    // Initial scan
    await this.scanForServices();

    // Setup periodic scanning
    if (this.options.scanInterval) {
      this.scanInterval = setInterval(() => {
        this.scanForServices().catch(error => {
          this.emit('error', error);
        });
      }, this.options.scanInterval);
    }

    // Setup health checking
    if (this.options.healthCheckInterval) {
      this.healthCheckInterval = setInterval(() => {
        this.checkServiceHealth().catch(error => {
          this.emit('error', error);
        });
      }, this.options.healthCheckInterval);
    }

    this.emit('started');
  }

  /**
   * Stop service discovery
   */
  async stop(): Promise<void> {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.emit('stopped');
  }

  /**
   * Scan for MCP services from configured sources
   */
  private async scanForServices(): Promise<void> {
    const discoveredServices: MCPServiceInfo[] = [];

    for (const source of this.options.discoverySources || []) {
      try {
        const services = await this.scanSource(source);
        discoveredServices.push(...services);
      } catch (error) {
        console.error(`Error scanning source ${source}:`, error);
      }
    }

    // Update service registry
    for (const service of discoveredServices) {
      await this.registerService(service);
    }

    this.emit('servicesUpdated', Array.from(this.services.values()));
  }

  /**
   * Scan specific discovery source
   */
  private async scanSource(source: string): Promise<MCPServiceInfo[]> {
    switch (source) {
      case 'local':
        return await this.scanLocalServices();
      case 'network':
        return await this.scanNetworkServices();
      case 'registry':
        return await this.scanRegistryServices();
      default:
        console.warn(`Unknown discovery source: ${source}`);
        return [];
    }
  }

  /**
   * Scan for local MCP services
   */
  private async scanLocalServices(): Promise<MCPServiceInfo[]> {
    const services: MCPServiceInfo[] = [];

    // Check for common MCP servers in PATH
    const commonServers = [
      {
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'MCP Filesystem Server',
        capabilities: ['filesystem', 'read', 'write'],
        tags: ['storage', 'local'],
      },
      {
        name: 'github',
        command: 'npx',
        args: ['@modelcontextprotocol/server-github'],
        description: 'MCP GitHub Server',
        capabilities: ['github', 'api', 'version-control'],
        tags: ['development', 'cloud'],
      },
      {
        name: 'clock',
        command: 'npx',
        args: ['@modelcontextprotocol/server-clock'],
        description: 'MCP Clock Server',
        capabilities: ['time', 'scheduling'],
        tags: ['utility'],
      },
    ];

    for (const server of commonServers) {
      services.push({
        id: `local:${server.name}`,
        name: server.name,
        description: server.description,
        transport: {
          type: 'stdio',
          command: server.command,
          args: server.args,
        },
        metadata: {
          discoveredAt: Date.now(),
          lastSeen: Date.now(),
          healthStatus: 'unknown',
          capabilities: server.capabilities,
          tags: server.tags,
        },
      });
    }

    return services;
  }

  /**
   * Scan for network MCP services (placeholder for future implementation)
   */
  private async scanNetworkServices(): Promise<MCPServiceInfo[]> {
    // TODO: Implement network service discovery
    // This could use mDNS, DNS-SD, or custom service registry
    return [];
  }

  /**
   * Scan for registry-based MCP services (placeholder for future implementation)
   */
  private async scanRegistryServices(): Promise<MCPServiceInfo[]> {
    // TODO: Implement registry-based service discovery
    // This could query a central service registry
    return [];
  }

  /**
   * Register or update a service
   */
  private async registerService(service: MCPServiceInfo): Promise<void> {
    const existingService = this.services.get(service.id);

    if (existingService) {
      // Update existing service
      existingService.metadata.lastSeen = Date.now();
      this.services.set(service.id, {
        ...existingService,
        ...service,
        metadata: {
          ...existingService.metadata,
          ...service.metadata,
        },
      });
      this.emit('serviceUpdated', service);
    } else {
      // Register new service
      this.services.set(service.id, service);
      this.emit('serviceRegistered', service);
    }
  }

  /**
   * Check health of all registered services
   */
  private async checkServiceHealth(): Promise<void> {
    for (const [serviceId, service] of this.services) {
      try {
        const isHealthy = await this.checkServiceHealthStatus(service);
        const newStatus = isHealthy ? 'healthy' : 'unhealthy';

        if (service.metadata.healthStatus !== newStatus) {
          service.metadata.healthStatus = newStatus;
          this.emit('serviceHealthChanged', service);
        }
      } catch (error) {
        console.error(`Error checking health for service ${serviceId}:`, error);
        service.metadata.healthStatus = 'unhealthy';
      }
    }
  }

  /**
   * Check health status of a specific service
   */
  private async checkServiceHealthStatus(_service: MCPServiceInfo): Promise<boolean> {
    // TODO: Implement actual health check
    // This could attempt to connect to the service or send a ping request
    return true; // Placeholder
  }

  /**
   * Get all discovered services
   */
  getAllServices(): MCPServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Get services matching filter criteria
   */
  getServices(filter?: ServiceFilter): MCPServiceInfo[] {
    let services = Array.from(this.services.values());

    if (filter) {
      if (filter.name) {
        services = services.filter(s => s.name.includes(filter.name!));
      }
      if (filter.tags && filter.tags.length > 0) {
        services = services.filter(s =>
          filter.tags!.some(tag => s.metadata.tags.includes(tag)),
        );
      }
      if (filter.capabilities && filter.capabilities.length > 0) {
        services = services.filter(s =>
          filter.capabilities!.some(cap => s.metadata.capabilities.includes(cap)),
        );
      }
      if (filter.healthStatus) {
        services = services.filter(s => s.metadata.healthStatus === filter.healthStatus);
      }
    }

    return services;
  }

  /**
   * Manually register a service
   */
  async register(service: Omit<MCPServiceInfo, 'id' | 'metadata'> & { id?: string; metadata?: Partial<MCPServiceInfo['metadata']> }): Promise<string> {
    const serviceId = service.id || `manual:${service.name}:${Date.now()}`;

    const serviceInfo: MCPServiceInfo = {
      ...service,
      id: serviceId,
      metadata: {
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
        healthStatus: 'unknown',
        capabilities: [],
        tags: [],
        ...service.metadata,
      },
    };

    await this.registerService(serviceInfo);
    return serviceId;
  }

  /**
   * Unregister a service
   */
  async unregister(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      this.emit('serviceUnregistered', service);
      return true;
    }
    return false;
  }
}

/**
 * Factory function to create service discovery manager
 */
export function createServiceDiscoveryManager(options?: ServiceDiscoveryOptions): ServiceDiscoveryManager {
  return new ServiceDiscoveryManager(options);
}
