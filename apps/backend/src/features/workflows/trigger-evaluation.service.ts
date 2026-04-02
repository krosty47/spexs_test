import { Injectable } from '@nestjs/common';
import type { TriggerConfig } from '@workflow-manager/shared';

export interface EvaluationResult {
  triggered: boolean;
  details: string;
}

@Injectable()
export class TriggerEvaluationService {
  /**
   * Evaluates a metric value against a trigger configuration.
   * Pure logic -- no DB or side effects.
   */
  evaluate(config: TriggerConfig, metricValue: number): EvaluationResult {
    if (config.type === 'THRESHOLD') {
      return this.evaluateThreshold(config, metricValue);
    }

    return this.evaluateVariance(config, metricValue);
  }

  /**
   * Renders an output message template by replacing {{metric}} and {{value}} variables.
   * Unmatched variables are left as-is.
   */
  renderMessage(template: string, metricName: string, metricValue: number): string {
    return template
      .replace(/\{\{metric\}\}/g, metricName)
      .replace(/\{\{value\}\}/g, String(metricValue));
  }

  private evaluateThreshold(
    config: Extract<TriggerConfig, { type: 'THRESHOLD' }>,
    metricValue: number,
  ): EvaluationResult {
    const { operator, value, metric } = config;
    let triggered: boolean;

    switch (operator) {
      case '>':
        triggered = metricValue > value;
        break;
      case '<':
        triggered = metricValue < value;
        break;
      case '>=':
        triggered = metricValue >= value;
        break;
      case '<=':
        triggered = metricValue <= value;
        break;
      case '==':
        triggered = metricValue === value;
        break;
      case '!=':
        triggered = metricValue !== value;
        break;
      default:
        triggered = false;
    }

    const details = `THRESHOLD: ${metric} ${metricValue} ${operator} ${value} = ${triggered}`;
    return { triggered, details };
  }

  private evaluateVariance(
    config: Extract<TriggerConfig, { type: 'VARIANCE' }>,
    metricValue: number,
  ): EvaluationResult {
    const { baseValue, deviationPercentage } = config;

    // Guard against division by zero
    if (baseValue === 0) {
      const triggered = metricValue !== 0;
      const details = `VARIANCE: baseValue=0, metricValue=${metricValue}, deviation=infinite -> triggered=${triggered}`;
      return { triggered, details };
    }

    const actualDeviation = (Math.abs(metricValue - baseValue) / Math.abs(baseValue)) * 100;
    const triggered = actualDeviation > deviationPercentage;
    const details = `VARIANCE: deviation=${actualDeviation.toFixed(2)}% vs threshold=${deviationPercentage}% -> triggered=${triggered}`;

    return { triggered, details };
  }
}
