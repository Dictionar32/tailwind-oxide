export interface EngineMetricsSnapshot {
  eventsReceived: number
  eventsProcessed: number
  batchesProcessed: number
  incrementalUpdates: number
  fullRescans: number
  skippedLargeFiles: number
  queueMaxSize: number
  lastBuildMs: number
  avgBuildMs: number
}

export class EngineMetricsCollector {
  private eventsReceived = 0
  private eventsProcessed = 0
  private batchesProcessed = 0
  private incrementalUpdates = 0
  private fullRescans = 0
  private skippedLargeFiles = 0
  private queueMaxSize = 0
  private lastBuildMs = 0
  private totalBuildMs = 0

  markEventReceived(queueSize: number): void {
    this.eventsReceived += 1
    if (queueSize > this.queueMaxSize) this.queueMaxSize = queueSize
  }

  markBatchProcessed(batchSize: number): void {
    this.batchesProcessed += 1
    this.eventsProcessed += batchSize
  }

  markIncremental(): void {
    this.incrementalUpdates += 1
  }

  markFullRescan(): void {
    this.fullRescans += 1
  }

  markSkippedLargeFile(): void {
    this.skippedLargeFiles += 1
  }

  markBuildDuration(ms: number): void {
    this.lastBuildMs = ms
    this.totalBuildMs += ms
  }

  snapshot(): EngineMetricsSnapshot {
    const avgBuildMs = this.batchesProcessed > 0 ? this.totalBuildMs / this.batchesProcessed : 0
    return {
      eventsReceived: this.eventsReceived,
      eventsProcessed: this.eventsProcessed,
      batchesProcessed: this.batchesProcessed,
      incrementalUpdates: this.incrementalUpdates,
      fullRescans: this.fullRescans,
      skippedLargeFiles: this.skippedLargeFiles,
      queueMaxSize: this.queueMaxSize,
      lastBuildMs: this.lastBuildMs,
      avgBuildMs,
    }
  }
}
