import { describe, expect, it } from 'vitest';
import { AppService } from './app.service.js';

describe('AppService', () => {
  it('reports API health', () => {
    expect(new AppService().getHealth()).toEqual({ status: 'ok', service: 'tcg-hobby-api' });
  });
});
