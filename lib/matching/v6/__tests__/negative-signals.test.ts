import { detectNegativeSignals } from '../negative-signals';
import { OrganizationType } from '@prisma/client';

test('detects ICT + dementia clinical mismatch', () => {
  const org = {
    id: 'o1',
    type: OrganizationType.COMPANY,
    industrySector: 'ICT',
  } as any;

  const program = {
    title: '치매 치료제 임상시험 연구개발',
    ministry: '보건복지부',
  } as any;

  const signals = detectNegativeSignals(org, program);
  expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_BIO')).toBe(true);
});
