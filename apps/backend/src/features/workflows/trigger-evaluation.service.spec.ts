import { Test, type TestingModule } from '@nestjs/testing';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import type { ThresholdConfig, VarianceConfig } from '@workflow-manager/shared';

describe('TriggerEvaluationService', () => {
  let service: TriggerEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TriggerEvaluationService],
    }).compile();

    service = module.get<TriggerEvaluationService>(TriggerEvaluationService);
  });

  describe('evaluate', () => {
    describe('THRESHOLD', () => {
      const baseConfig: Omit<ThresholdConfig, 'operator'> = {
        type: 'THRESHOLD',
        metric: 'cpu_usage',
        value: 90,
      };

      it('should trigger when metricValue > threshold value (operator >)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '>' };
        const result = service.evaluate(config, 95);
        expect(result.triggered).toBe(true);
      });

      it('should not trigger when metricValue <= threshold value (operator >)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '>' };
        expect(service.evaluate(config, 90).triggered).toBe(false);
        expect(service.evaluate(config, 85).triggered).toBe(false);
      });

      it('should trigger when metricValue < threshold value (operator <)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '<' };
        const result = service.evaluate(config, 85);
        expect(result.triggered).toBe(true);
      });

      it('should not trigger when metricValue >= threshold value (operator <)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '<' };
        expect(service.evaluate(config, 90).triggered).toBe(false);
        expect(service.evaluate(config, 95).triggered).toBe(false);
      });

      it('should trigger when metricValue >= threshold value (operator >=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '>=' };
        expect(service.evaluate(config, 90).triggered).toBe(true);
        expect(service.evaluate(config, 95).triggered).toBe(true);
      });

      it('should not trigger when metricValue < threshold value (operator >=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '>=' };
        expect(service.evaluate(config, 89).triggered).toBe(false);
      });

      it('should trigger when metricValue <= threshold value (operator <=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '<=' };
        expect(service.evaluate(config, 90).triggered).toBe(true);
        expect(service.evaluate(config, 85).triggered).toBe(true);
      });

      it('should not trigger when metricValue > threshold value (operator <=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '<=' };
        expect(service.evaluate(config, 91).triggered).toBe(false);
      });

      it('should trigger when metricValue == threshold value (operator ==)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '==' };
        expect(service.evaluate(config, 90).triggered).toBe(true);
      });

      it('should not trigger when metricValue != threshold value (operator ==)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '==' };
        expect(service.evaluate(config, 91).triggered).toBe(false);
      });

      it('should trigger when metricValue != threshold value (operator !=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '!=' };
        expect(service.evaluate(config, 91).triggered).toBe(true);
      });

      it('should not trigger when metricValue == threshold value (operator !=)', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '!=' };
        expect(service.evaluate(config, 90).triggered).toBe(false);
      });

      it('should include details in the result', () => {
        const config: ThresholdConfig = { ...baseConfig, operator: '>' };
        const result = service.evaluate(config, 95);
        expect(result.details).toBeDefined();
        expect(result.details.length).toBeGreaterThan(0);
      });
    });

    describe('VARIANCE', () => {
      const baseConfig: VarianceConfig = {
        type: 'VARIANCE',
        baseValue: 50,
        deviationPercentage: 20,
      };

      it('should trigger when deviation exceeds percentage', () => {
        // 50 -> 65 = 30% deviation, exceeds 20%
        const result = service.evaluate(baseConfig, 65);
        expect(result.triggered).toBe(true);
      });

      it('should not trigger when deviation is within range', () => {
        // 50 -> 55 = 10% deviation, within 20%
        const result = service.evaluate(baseConfig, 55);
        expect(result.triggered).toBe(false);
      });

      it('should trigger when deviation is exactly at boundary', () => {
        // 50 -> 60 = 20% deviation, at boundary -- should NOT trigger (must exceed)
        const result = service.evaluate(baseConfig, 60);
        expect(result.triggered).toBe(false);
      });

      it('should trigger for negative deviation exceeding percentage', () => {
        // 50 -> 35 = 30% deviation, exceeds 20%
        const result = service.evaluate(baseConfig, 35);
        expect(result.triggered).toBe(true);
      });

      it('should handle zero baseValue (division by zero guard)', () => {
        const config: VarianceConfig = {
          type: 'VARIANCE',
          baseValue: 0,
          deviationPercentage: 10,
        };
        // With baseValue 0 and any non-zero metric, should always trigger
        const result = service.evaluate(config, 5);
        expect(result.triggered).toBe(true);
      });

      it('should not trigger when baseValue is 0 and metricValue is also 0', () => {
        const config: VarianceConfig = {
          type: 'VARIANCE',
          baseValue: 0,
          deviationPercentage: 10,
        };
        const result = service.evaluate(config, 0);
        expect(result.triggered).toBe(false);
      });

      it('should include details in the result', () => {
        const result = service.evaluate(baseConfig, 65);
        expect(result.details).toBeDefined();
        expect(result.details.length).toBeGreaterThan(0);
      });
    });
  });

  describe('renderMessage', () => {
    it('should replace {{metric}} and {{value}} with actual values', () => {
      const result = service.renderMessage(
        'Alert: {{metric}} reached {{value}}%',
        'cpu_usage',
        95,
      );
      expect(result).toBe('Alert: cpu_usage reached 95%');
    });

    it('should leave unmatched {{unknown}} variables as-is', () => {
      const result = service.renderMessage(
        '{{metric}} is {{value}}, owner: {{owner}}',
        'cpu_usage',
        95,
      );
      expect(result).toBe('cpu_usage is 95, owner: {{owner}}');
    });

    it('should handle template with no variables', () => {
      const result = service.renderMessage('Static alert message', 'cpu', 50);
      expect(result).toBe('Static alert message');
    });

    it('should handle empty template', () => {
      const result = service.renderMessage('', 'cpu', 50);
      expect(result).toBe('');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const result = service.renderMessage(
        '{{metric}} alert: {{metric}} = {{value}}',
        'cpu',
        95,
      );
      expect(result).toBe('cpu alert: cpu = 95');
    });
  });
});
