import { describe, it, expect } from '@jest/globals';
import app from '../../../src/app.js';

describe('App Import Test', () => {
    it('should import app', () => {
        expect(app).toBeDefined();
    });
});
