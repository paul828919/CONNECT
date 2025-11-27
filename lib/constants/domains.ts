/**
 * Domain Configuration for NTIS R&D Categories
 *
 * These domains represent the major R&D categories covered by NTIS
 * (국가과학기술지식정보서비스) data.
 */

export interface Domain {
  code: string;
  name: string;
  nameEn: string;
  color: string;
  bgFrom: string;
  bgTo: string;
  border: string;
  hoverBorder: string;
  textColor: string;
}

export const NTIS_DOMAINS: Domain[] = [
  {
    code: 'ict',
    name: 'ICT',
    nameEn: 'ICT/Software',
    color: 'blue',
    bgFrom: 'from-blue-50',
    bgTo: 'to-blue-100/50',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-300',
    textColor: 'text-blue-600',
  },
  {
    code: 'industry',
    name: '산업기술',
    nameEn: 'Industrial Technology',
    color: 'slate',
    bgFrom: 'from-slate-50',
    bgTo: 'to-slate-100/50',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    textColor: 'text-slate-600',
  },
  {
    code: 'bio',
    name: '바이오',
    nameEn: 'Bio/Healthcare',
    color: 'emerald',
    bgFrom: 'from-emerald-50',
    bgTo: 'to-emerald-100/50',
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-300',
    textColor: 'text-emerald-600',
  },
  {
    code: 'sme',
    name: '중소벤처',
    nameEn: 'SME/Ventures',
    color: 'amber',
    bgFrom: 'from-amber-50',
    bgTo: 'to-amber-100/50',
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-300',
    textColor: 'text-amber-600',
  },
  {
    code: 'energy',
    name: '에너지',
    nameEn: 'Energy',
    color: 'yellow',
    bgFrom: 'from-yellow-50',
    bgTo: 'to-yellow-100/50',
    border: 'border-yellow-200',
    hoverBorder: 'hover:border-yellow-300',
    textColor: 'text-yellow-600',
  },
  {
    code: 'maritime',
    name: '해양',
    nameEn: 'Maritime',
    color: 'cyan',
    bgFrom: 'from-cyan-50',
    bgTo: 'to-cyan-100/50',
    border: 'border-cyan-200',
    hoverBorder: 'hover:border-cyan-300',
    textColor: 'text-cyan-600',
  },
  {
    code: 'culture',
    name: '문화콘텐츠',
    nameEn: 'Culture/Content',
    color: 'pink',
    bgFrom: 'from-pink-50',
    bgTo: 'to-pink-100/50',
    border: 'border-pink-200',
    hoverBorder: 'hover:border-pink-300',
    textColor: 'text-pink-600',
  },
  {
    code: 'defense',
    name: '국방',
    nameEn: 'Defense',
    color: 'indigo',
    bgFrom: 'from-indigo-50',
    bgTo: 'to-indigo-100/50',
    border: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-300',
    textColor: 'text-indigo-600',
  },
];

// NTIS Statistics
export const NTIS_STATS = {
  ministries: '30+',
  agencies: '80+',
  totalPrograms: '1,600+',
  activePrograms: '70+',
} as const;
