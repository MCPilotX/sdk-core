/**
 * Ticket Data Formatter
 * 
 * Formats train ticket data in a user-friendly way
 */

import { BaseFormatter } from './base-formatter';
import type { FormatContext } from '../types';

export class TicketDataFormatter extends BaseFormatter {
  id = 'ticket-data-formatter';
  name = 'Ticket Data Formatter';
  description = 'Formats train ticket data with train numbers, schedules, and seat availability';
  priority = 10; // High priority for ticket data
  
  supportedTypes = ['application/json'];
  supportedTools = [
    /get-tickets/i,
    /ticket/i,
    /train/i,
    /12306/i
  ];

  canFormat(data: any, context?: FormatContext): boolean {
    // Check if data matches ticket data pattern
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Pattern 1: Has tickets array
    if (Array.isArray(data.tickets) && data.tickets.length > 0) {
      const firstTicket = data.tickets[0];
      return this.isTicketObject(firstTicket);
    }

    // Pattern 2: Has data array with ticket-like objects
    if (Array.isArray(data.data) && data.data.length > 0) {
      const firstItem = data.data[0];
      return this.isTicketObject(firstItem);
    }

    // Pattern 3: Direct ticket object
    if (this.isTicketObject(data)) {
      return true;
    }

    // Pattern 4: Check by tool name
    const toolName = this.getToolName(context);
    if (toolName && this.matchesToolPattern(toolName)) {
      return true;
    }

    return false;
  }

  getConfidence(data: any, context?: FormatContext): number {
    let confidence = 0.5;
    
    // Boost confidence if data has clear ticket structure
    if (Array.isArray(data.tickets) && data.tickets.length > 0) {
      confidence += 0.3;
    }
    
    if (Array.isArray(data.data) && data.data.length > 0) {
      confidence += 0.2;
    }
    
    // Boost confidence if tool name matches
    const toolName = this.getToolName(context);
    if (toolName && this.matchesToolPattern(toolName)) {
      confidence += 0.2;
    }
    
    // Check if user query is about tickets
    const userQuery = this.getUserQuery(context);
    if (userQuery && this.isTicketRelatedQuery(userQuery)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  format(data: any, context?: FormatContext): string {
    this.logActivity('Formatting ticket data', { dataType: typeof data });
    
    // Extract tickets array
    const tickets = this.extractTickets(data);
    
    if (tickets.length === 0) {
      return this.formatNoTicketsFound(data, context);
    }
    
    return this.formatTicketsTable(tickets, context);
  }

  /**
   * Check if object is a ticket object
   */
  private isTicketObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // Check for common ticket fields
    const hasTrainInfo = !!(obj.trainNo || obj.trainNumber || obj.train_code);
    const hasRouteInfo = !!(obj.from || obj.to || obj.departure_station || obj.arrival_station);
    const hasTimeInfo = !!(obj.departureTime || obj.arrivalTime || obj.start_time || obj.end_time);
    
    return hasTrainInfo || hasRouteInfo || hasTimeInfo;
  }

  /**
   * Check if user query is ticket-related
   */
  private isTicketRelatedQuery(query: string): boolean {
    const ticketKeywords = [
      'ticket', 'train', 'rail', 'schedule', 'departure', 'arrival',
      'station', 'journey', 'travel', 'book', 'reservation',
      'seat', 'coach', 'compartment', 'fare', 'price'
    ];
    
    const lowerQuery = query.toLowerCase();
    return ticketKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Extract tickets from data
   */
  private extractTickets(data: any): any[] {
    if (Array.isArray(data.tickets)) {
      return data.tickets;
    }
    
    if (Array.isArray(data.data)) {
      return data.data;
    }
    
    if (Array.isArray(data)) {
      return data;
    }
    
    if (this.isTicketObject(data)) {
      return [data];
    }
    
    return [];
  }

  /**
   * Format when no tickets found
   */
  private formatNoTicketsFound(data: any, context?: FormatContext): string {
    const userQuery = this.getUserQuery(context);
    
    let message = '## 🎫 Ticket Search Results\n\n';
    message += 'No tickets found matching your criteria.\n\n';
    
    if (userQuery) {
      message += `**Search:** ${userQuery}\n\n`;
    }
    
    message += '**Suggestions:**\n';
    message += '• Try different dates or times\n';
    message += '• Check alternative routes\n';
    message += '• Verify station names are correct\n';
    message += '• Consider different seat classes\n';
    
    return message;
  }

  /**
   * Format tickets as a table
   */
  private formatTicketsTable(tickets: any[], context?: FormatContext): string {
    const userQuery = this.getUserQuery(context);
    
    let message = '## 🎫 Ticket Search Results\n\n';
    
    if (userQuery) {
      message += `**Search:** ${userQuery}\n\n`;
    }
    
    message += `Found **${tickets.length}** train${tickets.length > 1 ? 's' : ''}\n\n`;
    
    // Group tickets by date if available
    const ticketsByDate = this.groupTicketsByDate(tickets);
    const dateKeys = Object.keys(ticketsByDate).sort();
    
    for (const date of dateKeys) {
      const dateTickets = ticketsByDate[date];
      
      message += `### 📅 ${date}\n\n`;
      
      // Create table for this date's tickets
      message += this.createTicketTable(dateTickets);
      message += '\n';
    }
    
    // Add summary
    message += this.createTicketSummary(tickets);
    
    return message;
  }

  /**
   * Group tickets by date
   */
  private groupTicketsByDate(tickets: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    for (const ticket of tickets) {
      const date = this.extractDate(ticket);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(ticket);
    }
    
    return groups;
  }

  /**
   * Extract date from ticket
   */
  private extractDate(ticket: any): string {
    // Try various date fields
    const dateSources = [
      ticket.departureDate,
      ticket.date,
      ticket.travelDate,
      ticket.departureTime,
      ticket.start_time
    ];
    
    for (const source of dateSources) {
      if (source) {
        try {
          const date = new Date(source);
          return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } catch {
          // Continue to next source
        }
      }
    }
    
    return 'Unknown Date';
  }

  /**
   * Create ticket table
   */
  private createTicketTable(tickets: any[]): string {
    if (tickets.length === 0) {
      return 'No tickets for this date.\n';
    }
    
    // Limit to first 10 tickets per date for readability
    const displayTickets = tickets.slice(0, 10);
    
    let table = '| Train | From → To | Departure | Arrival | Duration | Seats | Price |\n';
    table += '|-------|-----------|-----------|---------|----------|-------|-------|\n';
    
    for (const ticket of displayTickets) {
      const trainNo = ticket.trainNo || ticket.trainNumber || ticket.train_code || 'N/A';
      const from = ticket.from || ticket.departure_station || 'N/A';
      const to = ticket.to || ticket.arrival_station || 'N/A';
      const departure = this.formatTime(ticket.departureTime || ticket.start_time);
      const arrival = this.formatTime(ticket.arrivalTime || ticket.end_time);
      const duration = this.formatDurationText(ticket.duration || ticket.run_time);
      const seats = this.formatSeatAvailability(ticket.seats || ticket.seat_info || {});
      const price = this.formatPrice(ticket.price);
      
      table += `| ${trainNo} | ${from} → ${to} | ${departure} | ${arrival} | ${duration} | ${seats} | ${price} |\n`;
    }
    
    if (tickets.length > 10) {
      table += `| ... | ... and ${tickets.length - 10} more tickets | ... | ... | ... | ... | ... |\n`;
    }
    
    return table;
  }

  /**
   * Format time
   */
  private formatTime(time: any): string {
    if (!time) {
      return 'N/A';
    }
    
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return String(time).substring(0, 8);
    }
  }

  /**
   * Format duration text
   */
  private formatDurationText(duration: any): string {
    if (!duration) {
      return 'N/A';
    }
    
    if (typeof duration === 'string') {
      return duration;
    }
    
    if (typeof duration === 'number') {
      // Assume minutes
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    
    return String(duration);
  }

  /**
   * Format seat availability
   */
  private formatSeatAvailability(seats: Record<string, any>): string {
    if (!seats || Object.keys(seats).length === 0) {
      return '❌';
    }
    
    const availableSeats: string[] = [];
    
    for (const [seatType, availability] of Object.entries(seats)) {
      if (availability && availability !== '无' && availability !== '0' && availability !== 'N/A') {
        availableSeats.push(`${seatType}: ${availability}`);
      }
    }
    
    if (availableSeats.length === 0) {
      return '❌';
    }
    
    return availableSeats.slice(0, 2).join(', ');
  }

  /**
   * Format price
   */
  private formatPrice(price: any): string {
    if (!price) {
      return 'N/A';
    }
    
    if (typeof price === 'number') {
      return `¥${price.toFixed(2)}`;
    }
    
    if (typeof price === 'string') {
      if (price.includes('¥') || price.includes('￥') || price.includes('$')) {
        return price;
      }
      return `¥${price}`;
    }
    
    return String(price);
  }

  /**
   * Create ticket summary
   */
  private createTicketSummary(tickets: any[]): string {
    let summary = '### 📊 Summary\n\n';
    
    // Count by train type
    const trainTypes: Record<string, number> = {};
    let totalPrice = 0;
    let priceCount = 0;
    
    for (const ticket of tickets) {
      const trainNo = ticket.trainNo || ticket.trainNumber || ticket.train_code || 'Unknown';
      const trainType = this.guessTrainType(trainNo);
      
      trainTypes[trainType] = (trainTypes[trainType] || 0) + 1;
      
      if (ticket.price) {
        const priceValue = typeof ticket.price === 'number' 
          ? ticket.price 
          : parseFloat(String(ticket.price).replace(/[^0-9.]/g, ''));
        
        if (!isNaN(priceValue)) {
          totalPrice += priceValue;
          priceCount++;
        }
      }
    }
    
    // Train type breakdown
    summary += '**Train Types:**\n';
    for (const [type, count] of Object.entries(trainTypes)) {
      summary += `• ${type}: ${count} train${count > 1 ? 's' : ''}\n`;
    }
    
    // Price summary
    if (priceCount > 0) {
      const avgPrice = totalPrice / priceCount;
      summary += `\n**Average Price:** ¥${avgPrice.toFixed(2)}\n`;
      summary += `**Price Range:** ${this.getPriceRange(tickets)}\n`;
    }
    
    // Time range
    const timeRange = this.getTimeRange(tickets);
    if (timeRange) {
      summary += `\n**Departure Times:** ${timeRange}\n`;
    }
    
    // Recommendations
    summary += '\n**💡 Recommendations:**\n';
    if (tickets.length > 5) {
      summary += '• Many options available, consider earliest or cheapest\n';
    } else if (tickets.length <= 2) {
      summary += '• Limited options, book soon to secure seats\n';
    }
    
    if (this.hasHighSpeedTrains(tickets)) {
      summary += '• High-speed trains available for faster travel\n';
    }
    
    return summary;
  }

  /**
   * Guess train type from train number
   */
  private guessTrainType(trainNo: string): string {
    const upperNo = trainNo.toUpperCase();
    
    if (upperNo.startsWith('G')) return 'High-speed (G)';
    if (upperNo.startsWith('D')) return 'Bullet (D)';
    if (upperNo.startsWith('C')) return 'Intercity (C)';
    if (upperNo.startsWith('Z')) return 'Direct Express (Z)';
    if (upperNo.startsWith('T')) return 'Express (T)';
    if (upperNo.startsWith('K')) return 'Fast (K)';
    if (/^\d/.test(trainNo)) return 'Regular';
    
    return 'Other';
  }

  /**
   * Get price range
   */
  private getPriceRange(tickets: any[]): string {
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    
    for (const ticket of tickets) {
      if (ticket.price) {
        const priceValue = typeof ticket.price === 'number' 
          ? ticket.price 
          : parseFloat(String(ticket.price).replace(/[^0-9.]/g, ''));
        
        if (!isNaN(priceValue)) {
          if (minPrice === null || priceValue < minPrice) {
            minPrice = priceValue;
          }
          if (maxPrice === null || priceValue > maxPrice) {
            maxPrice = priceValue;
          }
        }
      }
    }
    
    if (minPrice !== null && maxPrice !== null) {
      return `¥${minPrice.toFixed(2)} - ¥${maxPrice.toFixed(2)}`;
    }
    
    return 'N/A';
  }

  /**
   * Get time range
   */
  private getTimeRange(tickets: any[]): string {
    const times: Date[] = [];
    
    for (const ticket of tickets) {
      const timeStr = ticket.departureTime || ticket.start_time;
      if (timeStr) {
        try {
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            times.push(date);
          }
        } catch {
          // Ignore invalid dates
        }
      }
    }
    
    if (times.length === 0) {
      return '';
    }
    
    times.sort((a, b) => a.getTime() - b.getTime());
    
    const earliest = times[0];
    const latest = times[times.length - 1];
    
    return `${earliest.getHours().toString().padStart(2, '0')}:${earliest.getMinutes().toString().padStart(2, '0')} - ${latest.getHours().toString().padStart(2, '0')}:${latest.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Check if has high-speed trains
   */
  private hasHighSpeedTrains(tickets: any[]): boolean {
    return tickets.some(ticket => {
      const trainNo = ticket.trainNo || ticket.trainNumber || '';
      return trainNo.toUpperCase().startsWith('G') || trainNo.toUpperCase().startsWith('D');
    });
  }
}

export default TicketDataFormatter;